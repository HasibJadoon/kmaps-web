#!/usr/bin/env python3
"""Seed ar_intake_item (migration 0039) from yt-dlp listings.

Inputs (made with yt-dlp --flat-playlist --print):
  episodes.tsv  playlist_id \t playlist_title \t channel \t index \t video_id \t title \t duration
  singles.tsv   channel|tab|video_id|title|duration          (a channel's own uploads and shorts)

Each playlist below gets a strand, a level and a priority; its episodes
follow it. Channels are their own items, parents of their loose uploads. A video met twice
keeps the first, highest-priority parent (url is unique). Output is SQL for
  wrangler d1 execute km_arabic --remote --file <out>
which is not a migration: re-running it inserts only what is new (INSERT OR IGNORE).

usage: seed_intake.py episodes.tsv singles.tsv out.sql
"""
import csv, re, sys

# playlist id → (group, priority, register, genre, note); the group sets strand and level (SL), which
# a playlist can override (SL_BY_ID)
P = {
 # ── ear: dubbed cartoons, pure fuṣḥā ───────────────────────────────────────────
 'PL8XovLToH9hZlqNzxVe86-HQ6PNmyWchM': ('ear', 5, 'fusha_muasira', 'AG:qissa', 'Folktales of the world, classic Gulf fuṣḥā dub — the deepest easy listening on the list'),
 'PL8XovLToH9hZiaA9Tmqk5U8FdaaDEG0ii': ('ear', 5, 'fusha_muasira', 'AG:qissa', 'قصص الشعوب — same voices as حكايات عالمية'),
 'PL8XovLToH9haDQAKj9hnPRHXoqEQutzDd': ('ear', 4, 'fusha_muasira', 'AG:qissa', 'Tales of Magic, fuṣḥā dub'),
 'PL8XovLToH9ha3d6oDlj59s9g8j5hWufQd': ('ear', 4, 'fusha_muasira', 'AG:qissa', 'Old cartoon films of حكايات عالمية'),
 'PLnh9ZoQmXbU3tfLQuQyUW-RinVlr6SpcW': ('ear', 4, 'fusha_muasira', 'AG:qissa', 'حكايات عالمية with restored sound'),
 'PLBi9RC4H0BwhNc_iKsOZQT69qWBPc8Xko': ('ear', 5, 'fusha_muasira', 'AG:qissa', 'Maya the Bee — long run, high repetition'),
 'PL8XovLToH9hYU5sveeT2B-wesjvYZIgE9': ('ear', 4, 'fusha_muasira', 'AG:qissa', 'نحول in HD (بشار)'),
 'PL8XovLToH9hbD0b1PJSBMcw44REI-EXcq': ('ear', 4, 'fusha_muasira', 'AG:qissa', 'سنبل — long run'),
 'PL8XovLToH9haVoUuKjEgndZCisJsx1w7V': ('ear', 3, 'fusha_muasira', 'AG:qissa', 'بيل وسيبستيان'),
 'PL8XovLToH9hZ0fcfio-RzZH2z1iIKiKOn': ('ear', 3, 'fusha_muasira', 'AG:qissa', 'سانشيرو'),
 'PLBi9RC4H0BwgKgTxt_bKd10XuL9nRxECG': ('ear', 3, 'fusha_muasira', 'AG:qissa', 'فتيات وأمنيات'),
 'PLBi9RC4H0BwgHZlw7_fnW54kBRXy1pOV_': ('ear', 3, 'fusha_muasira', 'AG:qissa', 'غضبان الحيران'),
 'PLH9vUYpdxZEk':                      ('ear', 3, 'fusha_muasira', 'AG:qissa', 'لغز الجزيرة'),
 # ── story: children's dramas and programs, narrated tales ───────────────────────
 'PLBi9RC4H0Bwjl0ICCR5xj46OMA7cTJM1L': ('story', 4, 'fusha_muasira', 'AG:qissa', 'اليتيم — children''s drama'),
 'PLBi9RC4H0BwglCO0QZjwOi9RFgFRykW4Q': ('story', 3, 'fusha_muasira', 'AG:qissa', 'العرايس'),
 'PLBi9RC4H0Bwh4KTLxvKyc3wSldWaiatHH': ('story', 3, 'fusha_muasira', 'AG:qissa', 'سمع وأطاع'),
 'PLBi9RC4H0BwgNVKPGs0Iohq5oLT2bs9j9': ('story', 3, 'fusha_muasira', 'AG:qissa', 'شندل ومندل'),
 'PLBi9RC4H0BwhInE3tOZzzwj-8B43ryICf': ('story', 3, 'fusha_muasira', 'AG:qissa', 'وادي السباع'),
 'PLBi9RC4H0Bwg-PF9HB15Lw59evcXu9IBF': ('story', 3, 'fusha_muasira', 'AG:qissa', 'حكاية الحيوان'),
 'PLBi9RC4H0BwiK6_y1SlonOvt2yrIuxDVQ': ('story', 3, 'fusha_muasira', 'AG:qissa', 'سر القرية'),
 'PLBi9RC4H0BwhBeW_dzHW47QfhbRJj7aL0': ('story', 3, 'fusha_muasira', 'AG:qissa', 'حكايا عالم قرناس'),
 'PLBi9RC4H0Bwh37mzyc8CDhWxAYXNttRZS': ('story', 3, 'fusha_muasira', 'AG:qissa', 'حكايات قصيرة'),
 'PLBi9RC4H0BwhVjInCNM23f1C1717Qx1WF': ('story', 3, 'fusha_muasira', 'AG:qissa', 'مسلسل حكايات'),
 'PLBi9RC4H0Bwj_0_hWY15c8WSmzVdjDCCd': ('story', 3, 'fusha_muasira', 'AG:qissa', 'كنوز وحكايات'),
 'PLBi9RC4H0BwhEtI1QupM5-uuMMtJaFi8z': ('story', 2, 'fusha_muasira', 'AG:taalimi', 'حكايات كركور — studio program'),
 'PLBi9RC4H0BwiAEhWKKSPLbQ4juw0PNEHq': ('story', 2, 'fusha_muasira', 'AG:qissa', 'رحال'),
 'PLBi9RC4H0Bwjap9D5WHwYL5UBABD-OoQK': ('story', 2, 'fusha_muasira', 'AG:taalimi', 'إقرأ'),
 'PLBi9RC4H0BwjHHC2OcSU51pkXCGbk9gss': ('story', 2, 'fusha_muasira', 'AG:taalimi', 'فضاؤنا الكبير — science'),
 'PLBi9RC4H0Bwh1tchZUhOpECJK8_nBTJ3U': ('story', 2, 'fusha_muasira', 'AG:taalimi', 'أبطال الحروف'),
 'PLBi9RC4H0BwhtdARCNyco_wGcUo9LkevV': ('story', 2, 'fusha_muasira', 'AG:taalimi', 'حروف وبراعم — studio program'),
 'PLBi9RC4H0BwhC0cav45_NBBhmMALkb4ge': ('story', 2, 'fusha_muasira', 'AG:taalimi', 'قرية الأطفال — studio program'),
 'PLBi9RC4H0BwiwHubs9thEWtXp2oP5F7qi': ('story', 2, 'fusha_muasira', 'AG:taalimi', 'الرحلة'),
 # ── history: historical drama — setting, manners, body language ────────────────
 'PL3m7p9YRSnKuNuJQntE9ZKyHVKqT1-xyI': ('history', 5, 'fusha_turath', 'AG:qissa', 'Imam al-Bukhārī — ḥadīth culture, elevated fuṣḥā'),
 'PLBi9RC4H0BwhY0zKJ-IX-gTrO4Z1mkmZN': ('history', 5, 'fusha_turath', 'AG:qissa', 'Majālis Hārūn al-Rashīd — ʿAbbāsid court, adab'),
 'PLBi9RC4H0Bwj8rHJYnomHnDVTjM-Fb2_i': ('history', 4, 'fusha_turath', 'AG:adab', 'From al-Jāḥiẓ''s al-Bukhalāʾ — classical prose dramatised'),
 'PLeNgSiTufrj8':                      ('history', 4, 'fusha_turath', 'AG:adab', 'Kitāb al-Aghānī dramatised — poets and their stories'),
 'PLBi9RC4H0BwiirmUXk337xErtJkMTKdV9': ('history', 4, 'fusha_turath', 'AG:qissa', 'Abū Firās al-Ḥamdānī — poet-prince'),
 'PLBi9RC4H0BwhIDewRehplG7h3JjtJ3wXG': ('history', 3, 'fusha_turath', 'AG:qissa', 'رسول الخليفة'),
 'PLBi9RC4H0Bwh0BybwmfJUlOhzhDtfmOvS': ('history', 3, 'fusha_turath', 'AG:qissa', 'الشطار'),
 'PLBi9RC4H0BwggxoD717zk-MupkCtagDDO': ('history', 3, 'fusha_turath', 'AG:qissa', 'Umm ʿUmāra — ṣaḥābiyya'),
 'PLUyoLmRbptEk':                      ('history', 3, 'fusha_muasira', 'AG:qissa', 'Ṣaḥāba stories, anime narration'),
 'PLFuZefruU4KY':                      ('history', 2, 'fusha_muasira', 'AG:qissa', 'History films, anime narration'),
 # ── adab: poetry and literature (Tanween, Thikrayat) ───────────────────────────
 'PL6mPoTd7dO9gt1r-8m71ODfQUzEW9Auoz': ('adab', 5, 'fusha_turath', 'AG:shiar', 'ترانيم عربية with ʿĀrif Ḥijjāwī — classical poems recited and explained'),
 'PL6mPoTd7dO9hsJVdcExwFTdXOzWjvp6ZL': ('adab', 5, 'fusha_turath', 'AG:adab', 'With ʿĀrif Ḥijjāwī — language and literature'),
 'PL6mPoTd7dO9iHyQZhgmqii1fWaL9Z41-g': ('adab', 4, 'fusha_turath', 'AG:shiar', 'وحي القصيد — season 1'),
 'PL6mPoTd7dO9hHY8SL48FNayynWz-fsqcv': ('adab', 4, 'fusha_turath', 'AG:shiar', 'وحي القصيد — season 2'),
 'PL6mPoTd7dO9jWsd3WHBrNr6B84yTubcoF': ('adab', 4, 'fusha_turath', 'AG:shiar', 'وحي القصيد — season 3'),
 'PL6mPoTd7dO9iWDYyQHMqHVEvoZBnoeNid': ('adab', 4, 'fusha_turath', 'AG:shiar', 'أشعار وحي القصيد'),
 'PL6mPoTd7dO9ih4ZWdqWjc9lO4OsdKjOqZ': ('adab', 4, 'fusha_turath', 'AG:adab', 'أخلاق العرب — Arab virtues in their sources'),
 'PL6mPoTd7dO9hFYIMGokdPvcrABTC-oFlk': ('adab', 4, 'fusha_muasira', 'AG:adab', 'With al-Ṭanṭāwī'),
 'PL6mPoTd7dO9hyhxCboKITfdikAA5kczrF': ('adab', 3, 'fusha_muasira', 'AG:adab', 'نروي مآثرهم'),
 'PL6mPoTd7dO9jdyMieD_KiMh7RXAj5Ekb9': ('adab', 3, 'fusha_muasira', 'AG:adab', 'سِيَر'),
 'PL6mPoTd7dO9j-LQ82YNhKO8GW4UYBm3fC': ('adab', 3, 'fusha_muasira', 'AG:adab', 'بالبلدي الفصيح — fuṣḥā roots of dialect words'),
 'PL6mPoTd7dO9jLMI5sfJDOtOrlBDxr2Q2a': ('adab', 2, 'fusha_muasira', 'AG:adab', 'مستشرقون'),
 'PLTzOA_182tJE':                      ('adab', 3, 'fusha_turath', 'AG:shiar', 'بين شاعرين'),
 'PLKYE5unKZouU':                      ('adab', 2, 'fusha_muasira', 'AG:adab', 'أديب من بلادي'),
 # ── turath: classical books read aloud ─────────────────────────────────────────
 'PLJ3gpAj_2kuLvOuDSrnke-knGzaxBU0cd': ('turath', 4, 'fusha_turath', 'AG:adab', 'Audiobooks incl. لطائف الطرائف — no captions'),
 'PLJ3gpAj_2kuKfRkhs7lp0_3FBpU2cPCYc': ('turath', 2, 'fusha_muasira', 'AG:adab', 'Audio excerpts'),
 'PLJ3gpAj_2kuKTF6XW1GLAJ0D7aRmFNq-4': ('turath', 2, 'fusha_muasira', 'AG:adab', 'Excerpts'),
 'PLJ3gpAj_2kuLyizORJljiGTb2v-00ae-C': ('story', 2, 'fusha_muasira', 'AG:adab', 'بصائر, Haytham Ṭalʿat — modern prose audiobook'),
}

# channels: (url, title, group, priority, register, genre, note, singles key)
C = [
 ('https://www.youtube.com/@thikrayat_tv', 'قناة ذكريات', 'story', 3, 'fusha_muasira', 'AG:media', '485 playlists. Fuṣḥā ones logged separately; Gulf, Egyptian and Syrian dialect dramas left out. Worth a second pass for more.', None),
 ('https://www.youtube.com/channel/UCxUfxvkZb_0f-RsJmCsGGMw', 'حكايات عالمية | قصص الشعوب', 'ear', 4, 'fusha_muasira', 'AG:qissa', 'Home of the classic fuṣḥā dubs', None),
 ('https://www.youtube.com/channel/UCnT7KNxjHYAFGgRvvNGN0xQ', 'Sound Engineer جودة الكرتون القديم', 'ear', 2, 'fusha_muasira', 'AG:qissa', 'Restored audio of old cartoons — a cleaner source to capture from', 'Sound Engineer جودة الكرتون القديم'),
 ('https://www.youtube.com/@raawialazman', 'راوي الأزمان', 'story', 3, 'fusha_muasira', 'AG:qissa', 'Moral stories in clear modern fuṣḥā, long videos and shorts', 'The narrator of the times'),
 ('https://www.youtube.com/@TarikhAnime', 'التاريخ أنمي', 'history', 3, 'fusha_muasira', 'AG:qissa', 'Islamic history narrated over anime', 'التاريخ أنمي | History Anime'),
 ('https://www.youtube.com/@Tanwenmedia', 'تنوين بودكاست', 'adab', 4, 'fusha_turath', 'AG:shiar', 'Podcast network: poetry, language, history. Shorts are recited verses.', 'تنوين بودكاست  | Tanween Podcasts'),
 ('https://www.youtube.com/@voiceland', 'فويس لاند', 'turath', 3, 'fusha_muasira', 'AG:adab', 'Audiobooks, classical and modern', 'voice land'),
 ('https://www.youtube.com/@zenoanime_571', 'Zeno Anime', 'story', 1, 'fusha_muasira', 'AG:qissa', 'Short wisdom clips', 'Zeno Anime'),
]
# group → (strand, level)
SL = {'ear': ('lugha', 'easy'), 'story': ('lugha', 'easy'), 'history': ('history', 'middle'),
      'adab': ('adab', 'advanced'), 'turath': ('adab', 'super')}
SL_BY_ID = {
 'PL3m7p9YRSnKuNuJQntE9ZKyHVKqT1-xyI': ('history', 'advanced'),   # al-Bukhārī
 'PLBi9RC4H0BwhY0zKJ-IX-gTrO4Z1mkmZN': ('history', 'advanced'),   # Hārūn al-Rashīd
 'PLBi9RC4H0Bwj8rHJYnomHnDVTjM-Fb2_i': ('adab', 'advanced'),      # al-Bukhalāʾ
 'PLeNgSiTufrj8':                      ('adab', 'advanced'),      # al-Aghānī
 'PLBi9RC4H0BwiirmUXk337xErtJkMTKdV9': ('adab', 'advanced'),      # Abū Firās
 'PL6mPoTd7dO9gt1r-8m71ODfQUzEW9Auoz': ('adab', 'super'),         # ترانيم عربية
 'PL6mPoTd7dO9hsJVdcExwFTdXOzWjvp6ZL': ('adab', 'super'),         # Ḥijjāwī
 'PL6mPoTd7dO9hFYIMGokdPvcrABTC-oFlk': ('adab', 'middle'),        # al-Ṭanṭāwī
 'PL6mPoTd7dO9hyhxCboKITfdikAA5kczrF': ('history', 'middle'),     # نروي مآثرهم
 'PL6mPoTd7dO9jdyMieD_KiMh7RXAj5Ekb9': ('history', 'middle'),     # سِيَر
 'PL6mPoTd7dO9jLMI5sfJDOtOrlBDxr2Q2a': ('history', 'middle'),     # مستشرقون
 'PL6mPoTd7dO9j-LQ82YNhKO8GW4UYBm3fC': ('lugha', 'advanced'),     # بالبلدي الفصيح
 'PLKYE5unKZouU':                      ('adab', 'middle'),        # أديب من بلادي
 'PLJ3gpAj_2kuKfRkhs7lp0_3FBpU2cPCYc': ('adab', 'middle'),
 'PLJ3gpAj_2kuKTF6XW1GLAJ0D7aRmFNq-4': ('adab', 'middle'),
 'PLJ3gpAj_2kuLyizORJljiGTb2v-00ae-C': ('adab', 'middle'),
}
def strand_level(pid, group): return SL_BY_ID.get(pid) or SL[group]

SL_CH = {'راوي الأزمان': ('lugha', 'middle'), 'Zeno Anime': ('lugha', 'middle')}

# the single videos first sent, kept at the top of their channel
SENT = {'RDZH9sSsj-o', 'AYxsbQbuhDA', 'O6W8n9QTQ30', 'Kx-T-yqLhnI', 'vCtQxAVzvkQ', 'jWsYx2S2YSE', 'CUeeqIAfvy8', 'VCfeJ2rnqlA', '0w6RzkBArJM'}

def q(v):
    if v is None or v == '' or v == 'NA': return 'NULL'
    if isinstance(v, int): return str(v)
    return "'" + str(v).replace("'", "''") + "'"

def num(v):
    try: return int(float(v))
    except: return None

def row(**r):
    cols = ['id','parent_id','kind','url','platform','external_id','title_ar','channel','seq','duration_sec','item_count',
            'register','genre_ref','strand','level','priority','status','note','added_by','meta_json']
    r['strand'], r['level'] = r.pop('sl')
    r.setdefault('platform', 'youtube'); r.setdefault('added_by', 'seed:2026-10-14'); r.setdefault('meta_json', '{}')
    return f"INSERT OR IGNORE INTO ar_intake_item ({','.join(cols)}) VALUES ({','.join(q(r.get(c)) for c in cols)});"

def main(ep_path, si_path, out):
    eps = {}
    for r in csv.reader(open(ep_path, encoding='utf8'), delimiter='\t'):
        if len(r) >= 7: eps.setdefault(r[0], {'title': r[1], 'channel': r[2], 'rows': []})['rows'].append(r)
    singles = {}
    # channel|tab|id|title|duration — a channel name or a title may hold '|' itself
    for line in open(si_path, encoding='utf8'):
        m = re.match(r'^(.*)\|(videos|shorts)\|([\w-]{11})\|(.*)\|([^|]*)$', line.rstrip('\n'))
        if m: singles.setdefault(m.group(1), []).append(list(m.groups()))

    sql = ['-- ar_intake_item seed, generated by scripts/intake/seed_intake.py']
    # playlists, best first, so a shared episode keeps its best parent
    order = sorted(P, key=lambda k: (-P[k][1], ['ear','story','history','adab','turath','tafsir'].index(P[k][0])))
    for pid in order:
        if pid not in eps: continue
        group, pri, reg, genre, note = P[pid]; e = eps[pid]; sl = strand_level(pid, group)
        parent = f'IN:yt:{pid}'
        sql.append(row(id=parent, kind='playlist', url=f'https://www.youtube.com/playlist?list={pid}', external_id=pid,
                       title_ar=e['title'], channel=e['channel'], item_count=len(e['rows']), register=reg, genre_ref=genre,
                       sl=sl, priority=pri, status='queued', note=note))
        for r in e['rows']:
            sql.append(row(id=f'IN:yt:{r[4]}', parent_id=parent, kind='video', url=f'https://youtu.be/{r[4]}', external_id=r[4],
                           title_ar=r[5], channel=e['channel'], seq=num(r[3]), duration_sec=num(r[6]), register=reg, genre_ref=genre,
                           sl=sl, priority=pri, status='queued'))
    for url, title, group, pri, reg, genre, note, skey in C:
        sl = SL_CH.get(title) or SL[group]
        cid = 'IN:yt:' + url.rsplit('/', 1)[1]
        loose = singles.get(skey, []) if skey else []
        sql.append(row(id=cid, kind='channel', url=url, external_id=url.rsplit('/', 1)[1], title_ar=title, channel=title,
                       item_count=len(loose) or None, register=reg, genre_ref=genre, sl=sl, priority=pri, status='queued', note=note))
        for i, p in enumerate(sorted(loose, key=lambda p: p[2] not in SENT), 1):
            sent = p[2] in SENT
            sql.append(row(id=f'IN:yt:{p[2]}', parent_id=cid, kind='short' if p[1] == 'shorts' else 'video',
                           url=f'https://youtu.be/{p[2]}', external_id=p[2], title_ar=p[3], channel=title, seq=i,
                           duration_sec=num(p[4]), register=reg, genre_ref=genre, sl=sl,
                           priority=min(5, pri + 1) if sent else pri, status='queued' if sent else 'logged',
                           meta_json='{"sent":true}' if sent else '{}'))
    open(out, 'w', encoding='utf8').write('\n'.join(sql) + '\n')
    print(f'{len(sql) - 1} statements → {out}')

if __name__ == '__main__':
    main(*sys.argv[1:4])
