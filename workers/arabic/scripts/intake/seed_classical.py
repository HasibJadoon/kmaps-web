#!/usr/bin/env python3
"""Classical poetry recited and classical prose read aloud → the intake, and the works that hold a
worldview → km_worldview.

  poetry.tsv, prose.tsv   researched 2026-10-14 (yt-dlp metadata; register judged from titles/channels)

Writes two files:
  wv.sql   km_worldview: the jāhiliyya tradition, the authors not yet in core_person, and one
           wv_sources row per WORK (not per recording). Only works routed wv/both.
  ar.sql   km_arabic: an ar_intake_item per recording, form 'original', its route, and for a
           worldview work its typed ref wv_source_ref = 'WV:<wv_sources.id>'.

usage: seed_classical.py poetry.tsv prose.tsv [more.tsv …] wv.sql ar.sql
  A further TSV has prose.tsv's columns plus author_slug, author_type, work_slug, work_title, and
  names its own people and works. Re-running is safe: INSERT OR IGNORE in WV, upsert on url in AR.
"""
import csv, hashlib, json, re, sys, unicodedata

TRAD = {'modernity': 'wv-tradition-modernity', 'islam': 'wv-tradition-islam', 'sufism': 'wv-tradition-sufism', 'falsafa': 'wv-tradition-falsafa',
        'greek-philosophy': 'wv-tradition-greek-philosophy', 'jahiliyya': 'wv-tradition-jahiliyya'}
DOMAIN = {'modernity': 'philosophical', 'islam': 'religious', 'sufism': 'religious', 'falsafa': 'philosophical', 'jahiliyya': 'literary'}

# people already in core_person, by the name the research used
KNOWN = {'al-Ghazali': 'PN:al-ghazali', 'Ibn Khaldun': 'PN:ibn-khaldun', 'Ibn Qayyim al-Jawziyya': 'PN:ibn-qayyim',
         'Ibn Rushd': 'PN:ibn-rushd', 'Ibn Sina': 'PN:ibn-sina', 'Ibn Taymiyya': 'PN:ibn-taymiyya', 'al-Farabi': 'PN:al-farabi'}
# people to add: research name → (slug, name_en, name_ar, type, death_ce)
NEW = {
 'al-Mawardi': ('al-mawardi', 'al-Māwardī', 'الماوردي', 'scholar', 1058),
 'Abu Hayyan al-Tawhidi': ('abu-hayyan-al-tawhidi', 'Abū Ḥayyān al-Tawḥīdī', 'أبو حيان التوحيدي', 'author', 1023),
 'Abu Hayyan al-Tawhidi & Miskawayh': ('abu-hayyan-al-tawhidi', None, None, None, None),
 'Ibn Hazm': ('ibn-hazm', 'Ibn Ḥazm', 'ابن حزم', 'scholar', 1064),
 'Ibn Tufayl': ('ibn-tufayl', 'Ibn Ṭufayl', 'ابن طفيل', 'philosopher', 1185),
 'Abu Bakr al-Razi': ('abu-bakr-al-razi', 'Abū Bakr al-Rāzī', 'أبو بكر الرازي', 'philosopher', 925),
 'al-Harith al-Muhasibi': ('al-harith-al-muhasibi', 'al-Ḥārith al-Muḥāsibī', 'الحارث المحاسبي', 'scholar', 857),
 'Ṭarafa b. al-ʿAbd': ('tarafa-ibn-al-abd', 'Ṭarafa b. al-ʿAbd', 'طرفة بن العبد', 'poet', 564),
 'Labīd b. Rabīʿa': ('labid-ibn-rabia', 'Labīd b. Rabīʿa', 'لبيد بن ربيعة', 'poet', 661),
 'Zuhayr b. Abī Sulmā': ('zuhayr-ibn-abi-sulma', 'Zuhayr b. Abī Sulmā', 'زهير بن أبي سلمى', 'poet', 609),
 'al-Shanfarā': ('al-shanfara', 'al-Shanfarā', 'الشنفرى', 'poet', 525),
 'ʿUrwa b. al-Ward': ('urwa-ibn-al-ward', 'ʿUrwa b. al-Ward', 'عروة بن الورد', 'poet', 607),
 'Abū al-ʿAlāʾ al-Maʿarrī': ('abu-al-ala-al-maarri', 'Abū al-ʿAlāʾ al-Maʿarrī', 'أبو العلاء المعري', 'poet', 1057),
 'Abū al-ʿAtāhiya': ('abu-al-atahiya', 'Abū al-ʿAtāhiya', 'أبو العتاهية', 'poet', 826),
 'al-Būṣīrī': ('al-busiri', 'al-Būṣīrī', 'البوصيري', 'poet', 1294),
}

# slugs already in core_person (km_worldview), so a TSV that names them links rather than adds
EXISTING = {'al-ghazali', 'ibn-khaldun', 'ibn-qayyim', 'ibn-rushd', 'ibn-sina', 'ibn-taymiyya', 'al-farabi', 'al-kindi',
            'al-jahiz', 'rashid-rida', 'jamal-al-din-afghani', 'al-mawardi', 'ibn-hazm', 'al-harith-al-muhasibi',
            'abu-hayyan-al-tawhidi', 'ibn-tufayl', 'abu-bakr-al-razi'}

def person(name, row=None):
    # a TSV with author_slug says who it is itself
    if row and row.get('author_slug'):
        sl = row['author_slug'].strip()
        if sl not in EXISTING and row.get('author_en'):
            try: death = int(re.sub(r'\D', '', row.get('author_death_ce') or '') or 0) or None
            except ValueError: death = None
            NEW.setdefault('slug:' + sl, (sl, row['author_en'], row.get('author_ar') or None,
                                          row.get('author_type') or 'scholar', death))
        return 'PN:' + sl
    if name in KNOWN: return KNOWN[name]
    if name in NEW: return 'PN:' + NEW[name][0]
    return None

def slug(s):
    s = re.sub(r"[ʿʾ'’]", '', s.lower()); s = re.sub(r'[^a-z0-9]+', '-', s)
    return s.strip('-')[:60]

def q(v):
    if v is None or v == '': return 'NULL'
    if isinstance(v, int): return str(v)
    return "'" + str(v).replace("'", "''") + "'"

def poetry_work(r):
    """The work a poetry recording is a reading of."""
    p, t = r['poet_en'], r['title']
    if 'Muʿallaqa' in p: return ('al-muallaqat', 'al-Muʿallaqāt', 'المعلقات', None, 'diwan')
    if p == 'al-Shanfarā' and r['kind'] == 'video': return ('lamiyyat-al-arab', 'Lāmiyyat al-ʿArab', 'لامية العرب', p, 'diwan')
    if p.startswith('al-Muhalhil'): return ('ashar-harb-al-basus', 'Poems of the Basūs War', 'أشعار حرب البسوس', None, 'diwan')
    if p.startswith('Kaʿb b. Zuhayr, Abū Ṭālib'): return ('al-madaih-al-nabawiyya', 'Praise poems of the Prophet', 'المدائح النبوية', None, 'diwan')
    if p == 'al-Būṣīrī': return ('al-burda', 'al-Burda', 'البردة', p, 'diwan')
    if 'Qaḥṭānī' in p: return ('nuniyyat-al-qahtani', 'al-Nūniyya (attributed to al-Qaḥṭānī)', 'نونية القحطاني', None, 'diwan')
    if p == 'Abū al-ʿAlāʾ al-Maʿarrī': return ('shir-abi-al-ala', 'Poems of Abū al-ʿAlāʾ (selection)', 'من شعر أبي العلاء المعري', p, 'diwan')
    ar = r['poet_ar']
    return (slug('diwan ' + NEW.get(p, (p,))[0]), f'Dīwān {p}', f'ديوان {ar}', p, 'diwan')

# a work's name as km_worldview writes it: transliterated, the English after it; plus the
# tradition where the research's guess was wrong (al-Ghazālī's Tahāfut is a critique OF falsafa)
TITLE = {
 'إحياء علوم الدين': ('ihya-ulum-al-din', 'Iḥyāʾ ʿUlūm al-Dīn (The Revival of the Religious Sciences)'),
 'المنقذ من الضلال': ('al-munqidh-min-al-dalal', 'al-Munqidh min al-Ḍalāl (Deliverance from Error)'),
 'ميزان العمل': ('mizan-al-amal', 'Mīzān al-ʿAmal (The Criterion of Action)'),
 'فيصل التفرقة بين الإسلام والزندقة': ('faysal-al-tafriqa', 'Fayṣal al-Tafriqa (The Decisive Criterion between Islam and Unbelief)'),
 'تهافت الفلاسفة': ('tahafut-al-falasifa', 'Tahāfut al-Falāsifa (The Incoherence of the Philosophers)'),
 'بداية الهداية': ('bidayat-al-hidaya', 'Bidāyat al-Hidāya (The Beginning of Guidance)'),
 'أيها الولد': ('ayyuha-al-walad', 'Ayyuhā al-Walad (O Son)'),
 'المقدمة': ('muqaddimat-ibn-khaldun', 'al-Muqaddima (The Prolegomena)'),
 'الفوائد': ('al-fawaid', 'al-Fawāʾid (Benefits)'),
 'مدارج السالكين': ('madarij-al-salikin', 'Madārij al-Sālikīn (The Ranks of the Wayfarers)'),
 'الداء والدواء': ('al-da-wa-l-dawa', 'al-Dāʾ wa-l-Dawāʾ (The Disease and the Cure)'),
 'زاد المعاد': ('zad-al-maad', 'Zād al-Maʿād (Provisions for the Hereafter)'),
 'العبودية': ('al-ubudiyya', 'al-ʿUbūdiyya (Servitude to God)'),
 'فصل المقال': ('fasl-al-maqal', 'Faṣl al-Maqāl (The Decisive Treatise)'),
 'تهافت التهافت': ('tahafut-al-tahafut', 'Tahāfut al-Tahāfut (The Incoherence of the Incoherence)'),
 'المبدأ والمعاد': ('al-mabda-wa-l-maad', 'al-Mabdaʾ wa-l-Maʿād (The Origin and the Return)'),
 'حي بن يقظان': ('hayy-ibn-yaqzan', 'Ḥayy ibn Yaqẓān'),
 'آراء أهل المدينة الفاضلة': ('ara-ahl-al-madina-al-fadila', 'Ārāʾ Ahl al-Madīna al-Fāḍila (The Virtuous City)'),
 'الأخلاق والسير': ('al-akhlaq-wa-l-siyar', 'al-Akhlāq wa-l-Siyar (Ethics and Conduct)'),
 'أدب الدنيا والدين': ('adab-al-dunya-wa-l-din', 'Adab al-Dunyā wa-l-Dīn (Ethics of Religion and the World)'),
 'رسالة المسترشدين': ('risalat-al-mustarshidin', 'Risālat al-Mustarshidīn (Treatise for the Seekers of Guidance)'),
 'الإمتاع والمؤانسة': ('al-imta-wa-l-muanasa', 'al-Imtāʿ wa-l-Muʾānasa (Enjoyment and Conviviality)'),
 'الإشارات الإلهية': ('al-isharat-al-ilahiyya', 'al-Ishārāt al-Ilāhiyya (Divine Intimations)'),
 'الهوامل والشوامل': ('al-hawamil-wa-l-shawamil', 'al-Hawāmil wa-l-Shawāmil (Scattered Questions and Comprehensive Answers)'),
 'الطب الروحاني': ('al-tibb-al-ruhani', 'al-Ṭibb al-Rūḥānī (Spiritual Physick)'),
}
TRAD_FIX = {'تهافت الفلاسفة': 'islam', 'ميزان العمل': 'islam'}

def prose_work(r):
    w_ar = r['work_ar']
    if r.get('work_slug') and r.get('work_title'):
        return (r['work_slug'].strip(), r['work_title'].strip(), w_ar, r['author_en'], 'diwan' if 'ديوان' in w_ar else 'book')
    if w_ar.startswith('إحياء علوم الدين'): w_ar = 'إحياء علوم الدين'
    if w_ar == 'كتب أبو حامد الغزالي': return None          # a mixed playlist of several works
    if w_ar in TITLE: return (TITLE[w_ar][0], TITLE[w_ar][1], w_ar, r['author_en'], 'book')
    en = re.sub(r'\s*\(.*?\)\s*', '', r['work_en']).strip()
    return (slug(en), en, w_ar, r['author_en'], 'book')

def norm_ar(t):
    t = unicodedata.normalize('NFKD', t or '')
    t = ''.join(c for c in t if not unicodedata.combining(c))
    return re.sub(r'[\s\u0640]+', ' ', t.replace('أ', 'ا').replace('إ', 'ا').replace('آ', 'ا').replace('ة', 'ه')).strip()

def main(poetry, *rest):
    # --existing <wv_existing.json>: what km_worldview already holds, so a work met again — under
    # another slug, from another TSV — reuses its row, and a known person is linked, not added
    rest = list(rest); existing = {'works': {}, 'slugs': set(), 'db_slugs': set(), 'people': set()}
    if '--existing' in rest:
        i = rest.index('--existing'); path = rest[i + 1]; del rest[i:i + 2]
        for r in json.load(open(path))[0]['results']:
            if r['id'] == 'PERSON': existing['people'].add(r['slug']); continue
            existing['slugs'].add(r['slug']); existing['db_slugs'].add(r['slug'])
            if r['title_ar']: existing['works'][(norm_ar(r['title_ar']), r['person_ref'])] = r['id']
    EXISTING.update(existing['people'])
    *prose_files, wv_out, ar_out = rest
    pipe_out = {d: ar_out.replace('.sql', f'_{d}_pipeline.sql') for d in ('qr', 'wv')}
    pipes = {'qr': [], 'wv': []}
    rows = [dict(r, _src='poetry') for r in csv.DictReader(open(poetry, encoding='utf8'), delimiter='\t')]
    for f in prose_files:
        rows += [dict(r, _src='prose') for r in csv.DictReader(open(f, encoding='utf8'), delimiter='\t')]
    works, people, ar = {}, {}, []
    for r in rows:
        route = r['route'] if r['route'] in ('ar', 'wv', 'both') else 'ar'
        ref = None
        if route != 'ar':
            w = poetry_work(r) if r['_src'] == 'poetry' else prose_work(r)
            if w:
                author = w[3]
                pkey = person(author, r) if author else None
                key = (norm_ar(w[2]), pkey)
                near = next((v for (t, pk), v in existing['works'].items()
                             if pk == pkey and t and (key[0].startswith(t) or t.startswith(key[0]))), None)
                if key in existing['works'] or near:
                    wid = existing['works'].get(key) or near           # the same work, met again (maybe with its subtitle)
                else:
                    wid = 'wv-src-' + w[0]
                    taken = wid.removeprefix('wv-src-') in existing['slugs'] or wid in works
                    if taken:                                          # the same title by another author
                        wid = f"wv-src-{w[0]}-{(pkey or 'anon').removeprefix('PN:')}"
                    existing['works'][key] = wid
                    existing['slugs'].add(wid.removeprefix('wv-src-'))
                ref = 'WV:' + wid
                trad = r['wv_tradition'] if r['wv_tradition'] in TRAD else 'islam'
                trad = TRAD_FIX.get(w[2], trad)
                no_trad = author == 'Abū al-ʿAlāʾ al-Maʿarrī'   # a sceptic, not a Peripatetic: no tradition fits
                key2 = 'slug:' + r['author_slug'].strip() if r.get('author_slug') else author
                if key2 in NEW and NEW[key2][1] and NEW[key2][0] not in EXISTING: people[NEW[key2][0]] = NEW[key2]
                if wid not in works and wid.removeprefix('wv-src-') not in existing['db_slugs']:
                    domain = 'historical' if w[2] == 'المقدمة' else 'philosophical' if no_trad else DOMAIN.get(trad, 'general')
                    works[wid] = dict(id=wid, slug=wid.removeprefix('wv-src-'), title=w[1], title_ar=w[2], type=w[4], domain=domain,
                                      trad=None if no_trad else TRAD[trad], person=pkey, author_ar=(r.get('author_ar') or r.get('poet_ar')))
        pri = max(1, min(5, int(r['priority'] or 3)))
        kind = r['kind'] if r['kind'] in ('playlist', 'video') else 'video'
        ext = r['external_id']
        url = f'https://www.youtube.com/playlist?list={ext}' if kind == 'playlist' else f'https://youtu.be/{ext}'
        n = r['item_count'] if (r['item_count'] or '').isdigit() else None
        strand = r['strand'] if r['strand'] in ('lugha', 'history', 'adab', 'quran') else 'adab'
        level = r['level'] if r['level'] in ('easy', 'middle', 'advanced', 'super') else 'advanced'
        genre = 'AG:shiar' if r['_src'] == 'poetry' else 'AG:adab'
        note = r['note'] + (' [brief word glosses]' if r['form'] == 'original_glossed' else '')
        doms = {'ar': ['ar'], 'wv': ['wv'], 'both': ['ar', 'wv']}[route]
        if strand == 'quran': doms = ['qr' if d == 'ar' else d for d in doms]
        status = 'queued' if pri >= 4 else 'logged'
        iid = 'IN:yt:' + ext
        ar.append(
            "INSERT INTO ar_intake_item (id,kind,url,platform,external_id,title_ar,channel,item_count,register,genre_ref,strand,level,"
            "priority,status,form,route,to_ar,to_qr,to_wv,wv_source_ref,note,added_by) VALUES (" + ",".join([
                q('IN:yt:' + ext), q(kind), q(url), q('youtube'), q(ext), q(r['title']), q(r['channel']), n or 'NULL',
                q('fusha_turath'), q(genre), q(strand), q(level), str(pri), q(status),
                q('original'), q(route), *[str(+(d in doms)) for d in ('ar', 'qr', 'wv')], q(ref), q(note), q('research:2026-10-14:classical')]) + ")"
            " ON CONFLICT(url) DO UPDATE SET form = excluded.form, wv_source_ref = COALESCE(excluded.wv_source_ref, ar_intake_item.wv_source_ref),"
            " updated_at = datetime('now');")
        # a queued item enters each of its domains' pipelines (the inbox row decides; an existing row keeps its own route)
        ar.append(f"INSERT OR IGNORE INTO ar_intake_pipeline (intake_id) SELECT id FROM ar_intake_item WHERE id = {q(iid)} AND status = 'queued' AND to_ar = 1;")
        if status == 'queued':
            for d in ('qr', 'wv'):
                if d in doms:
                    tgt = ref.replace('WV:', '') if (d == 'wv' and ref) else None
                    pipes[d].append(f"INSERT OR IGNORE INTO {d}_intake_pipeline (intake_ref, url, title, kind, item_count, target_ref) VALUES ("
                                    + ",".join([q('AR:' + iid), q(url), q(r['title']), q(kind), n or 'NULL', q(tgt)]) + ");")

    wv = ["-- 010_wv_classical_sources.sql",
          "-- Classical works that hold a worldview, filed as sources: the jāhilī poetry the Qurʾān answers, and the",
          "-- theology, Sufism, falsafa and theory of society of al-Ghazālī, Ibn Khaldūn, Ibn al-Qayyim, Ibn Rushd and",
          "-- others. One row per WORK. The recordings of each (recited or read straight through) are intake items in",
          "-- km_arabic (ar_intake_item.wv_source_ref = 'WV:<id>'); nothing about them is copied here.",
          "-- Generated by kmaps-web workers/arabic/scripts/intake/seed_classical.py.", "",
          "INSERT OR IGNORE INTO wv_traditions (id, slug, title, title_ar, tradition_type, founded_period, geographic_origin, description_md) VALUES",
          " ('wv-tradition-jahiliyya', 'jahiliyya', 'Jāhiliyya (pre-Islamic Arabia)', 'الجاهلية', 'era', 'c. 500–610 CE', 'Arabia',",
          "  'The outlook of pre-Islamic Arabia as its poetry voices it — time (dahr) and fate, tribal honour (muruwwa), generosity, revenge, the brevity of life — the frame of reference the Qurʾān addresses and its early commentators cite.');",
          ""]
    for s, (slug_, en, ar_, typ, death) in sorted(people.items()):
        uid = hashlib.md5(('PN:' + slug_).encode()).hexdigest()[:26]
        wv.append("INSERT OR IGNORE INTO core_person (id, uid, person_key, name_en, name_ar, person_type, death_year, origin) VALUES ("
                  + ",".join([q('PN:' + slug_), q(uid), q(slug_), q(en), q(ar_), q(typ), str(death), q('worldview')]) + ");")
    wv.append("")
    for w in works.values():
        meta = '{"author_ar":' + (('"' + w['author_ar'].replace('"', '') + '"') if w['author_ar'] else 'null') + ',"media":"ar_intake"}'
        wv.append("INSERT OR IGNORE INTO wv_sources (id, slug, title, title_ar, source_type, source_domain, tradition_id, language, person_ref, meta_json) VALUES ("
                  + ",".join([q(w['id']), q(w['slug']), q(w['title']), q(w['title_ar']), q(w['type']), q(w['domain']),
                              q(w['trad']), q('ar'), q(w['person']), q(meta)]) + ");")
    open(wv_out, 'w', encoding='utf8').write("\n".join(wv) + "\n")
    for d, lines in pipes.items(): open(pipe_out[d], 'w', encoding='utf8').write("\n".join(lines) + "\n")
    open(ar_out, 'w', encoding='utf8').write("\n".join(ar) + "\n")
    print(f'{len(people)} people, {len(works)} works → {wv_out}; {len(ar)} intake rows → {ar_out}')

if __name__ == '__main__':
    main(*sys.argv[1:])
