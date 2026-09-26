# -*- coding: utf-8 -*-
"""The script of «ناقة صالح — ج 2» (Animal Stories from the Qur'an, ep. 4),
reconstructed from the raw YouTube auto-captions in ar_text_unit.text_ar by
reading the Arabic alone — its grammar, the scene, and the Qur'an it echoes.
The archive's machine English is not used; the English here is translated
fresh from the reconstructed Arabic.

    python3 scripts/episodes/apply.py naqa_ep2
"""
import json

UNIT = 'ARTX:YT-zIQF6uu1TVs:1'

GUIDE, NAQA, CALF, MOTHER = 'الحادي', 'ناقة الله', 'الحُوار', 'امرأة من ثمود'
HAWKER, MERCHANT, BUILDER, KILLER, NARR = 'بائع الأصنام', 'كبير تجار الأصنام', 'البنّاء', 'عاقر الناقة', 'راوٍ'

CAST = [
    dict(name_ar=GUIDE, name_en='The Cameleer', role_en='finishes the story for his camels', icon='figure.walk'),
    dict(name_ar=NAQA, name_en="God's She-Camel", role_en='born of the mountain; mother of a calf', icon='sparkles'),
    dict(name_ar=CALF, name_en='Ḥuwār, her calf', role_en='a ḥuwār: what a newborn camel is called', icon='star.fill'),
    dict(name_ar=MOTHER, name_en='A mother of Thamūd', role_en='whose little girl drinks the she-camel\'s milk', icon='person.fill'),
    dict(name_ar=HAWKER, name_en='The Idol-Hawker', role_en='sells gods no one wants', icon='cart.fill'),
    dict(name_ar=MERCHANT, name_en='The Idol-Merchant', role_en="his master, the richest idol-seller in Thamūd", icon='building.columns.fill'),
    dict(name_ar=BUILDER, name_en='The Builder', role_en='whose grand houses no longer sell', icon='hammer.fill'),
    dict(name_ar=KILLER, name_en='The Hamstringer', role_en='the drunkard sent with a sword', icon='exclamationmark.octagon.fill'),
    dict(name_ar=NARR, name_en='Narrator', role_en='recites the āyāt', icon='book.closed.fill'),
]


def L(speaker, ar, en, note=None):
    d = dict(speaker=speaker, ar=ar, en=en)
    if note: d['note'] = note
    return d


def caption(heard, read):
    return f'الأصل في التفريغ: «{heard}» — رُجّحت «{read}» اعتماداً على السياق والنحو'


def qamar(n):
    return f"آية قرآنية — سورة القمر ٥٤:{dict(zip(range(27, 32), '٢٧ ٢٨ ٢٩ ٣٠ ٣١'.split()))[n]} | Qur'an 54:{n}"


UNNAMED = 'المتكلم لا يُسمّى | the speaker is unnamed'

SCENES = [
    dict(title_ar='المشهد الأول — الطريق من جديد', title_en='Scene 1 — The Road Again',
         icon='sun.haze.fill', era='present',
         summary_en='Morning on the road. The cameleer reminds his little camel where the story stopped.',
         lines=[
        L(GUIDE, 'لا تُجهدي نفسك، لا داعي للتعجّل. هل أكمل لك حكاية ناقة الله؟ سأذكّرك سريعاً بالأحداث.',
          "Don't tire yourself — there's no hurry. Shall I go on with the story of God's she-camel? Let me remind you quickly what happened."),
        L(GUIDE, 'خرجت ناقة الله من بطن الجبل آيةً ودليلَ نبوّة، طلبه أهل ثمود من نبيّهم صالح. لكن الأشرار في ثمود اجتمعوا غاضبين من وجود الناقة بينهم.',
          "God's she-camel came out of the belly of the mountain — a sign, the proof of prophethood that the people of Thamūd had demanded of their prophet Ṣāliḥ. But the wicked of Thamūd gathered, furious that the camel was among them.",
          caption('كايه … وجود النار', 'آيةً … وجود الناقة')),
    ]),
    dict(title_ar='المشهد الثاني — خمس سنوات', title_en='Scene 2 — Five Years',
         icon='hourglass', era='past',
         summary_en='The wicked count the years until a newborn camel could ever give milk.',
         lines=[
        L(None, 'يقول صالح إننا سنشرب من لبن الناقة بعد أن تضع وليدها. إن النوق تلد بعد العام الخامس من ولادتها؛ فهل سننتظر على هذا الحال خمس سنوات؟',
          "Ṣāliḥ says we'll drink the camel's milk once she's had her young. Camels don't calve until their fifth year — are we to wait like this for five years?",
          caption('والدها … النو', 'وليدها … النوق') + ' · ' + UNNAMED),
        L(None, 'لا، هذا كثير!', "No — that's too much!"),
        L(None, 'لقد كانت أرضنا تُعرف بين القبائل بأرض ثمود، والآن أصبحت تسمّى أرض الناقة! وعلينا أن ننتظر الناقة خمس سنوات على الأقل لتلد وتسقينا اللبن.',
          "Among the tribes our land was known as the land of Thamūd — now they call it the land of the camel! And we're to wait five years at least for her to calve and give us milk.",
          caption('وتسقين', 'وتسقينا')),
    ]),
    dict(title_ar='المشهد الثالث — أمٌّ في ثلاثة أيام', title_en='Scene 3 — A Mother at Three Days',
         icon='heart.circle.fill', era='past',
         summary_en='Three days old, the she-camel is already expecting — her second sign.',
         lines=[
        L(None, 'ما… هل أنتِ مريضة؟', "What… are you ill?", UNNAMED),
        L(NAQA, 'لا، بل إنني أنتظر مولوداً.', "No — I'm expecting a little one."),
        L(None, 'أنتِ مولودة منذ ثلاثة أيام فقط، فكيف تصبحين أمّاً؟', 'You were born only three days ago — how can you become a mother?'),
        L(NAQA, 'لا دخل لي بحسابات البشر أو طبائع الحيوان. كما قلت لك من قبل: إنني مأمورة في كل ما يحدث لي.',
          "The reckonings of men and the ways of animals have nothing to do with me. As I told you before: in everything that happens to me, I am under command.",
          caption('ماموره بكل ما', 'مأمورة في كل ما')),
        L(None, 'هل تشعرين بتعب؟', 'Do you feel tired?'),
        L(NAQA, 'لا، أشعر بإحساس جديد: أجدني مشدودة إلى الكائن الذي بداخلي، أفكّر فيه وأخاف عليه، وأحبّه حتى من قبل أن أراه.',
          "No. I feel something new: I find myself drawn to the life inside me. I think about it, I fear for it — and I love it, even before I've seen it."),
        L(NAQA, 'لماذا تبكي يا صغير؟ إن الحياة هديّة جميلة من الخالق، يجب أن نفرح بها ونشكره عليها ونسبّح بحمده.',
          'Why are you crying, little one? Life is a beautiful gift from the Creator — we should rejoice in it, thank Him for it, and glorify His praise.',
          '[بعد الولادة، تخاطب وليدها | after the birth, to her calf]'),
        L(NAQA, 'انظر إلى جموع الناس في أسفل الجبل، إنهم ينتظرون حضورك؛ فأنت الآية الثانية لي في هذه الدنيا.',
          "Look at the crowds at the foot of the mountain — they're waiting for you. You are my second sign in this world."),
        L(GUIDE, 'وهكذا نامت ناقة الله تحتضن وليدها، وهي لا تدري ماذا تخبّئ له الأيام القادمة.',
          "And so God's she-camel slept with her calf in her arms, not knowing what the days ahead held in store for him.",
          caption('والدها … تخبر', 'وليدها … تخبّئ')),
        L(NAQA, 'لا تلعب أثناء تناول الطعام. أحسنت! أنت حُوارٌ طيب ومطيع. حُوارٌ هو اسمك: الجمل المولود يسمّى حُواراً.',
          "Don't play while you're eating. Well done! You're a good, obedient ḥuwār. Ḥuwār is your name — a newborn camel is called a ḥuwār."),
    ]),
    dict(title_ar='المشهد الرابع — لبنٌ لثمود', title_en='Scene 4 — Milk for Thamūd',
         icon='drop.fill', era='past',
         summary_en="A little girl slips away to drink on the calf's day — and the she-camel lets her.",
         lines=[
        L(NAQA, 'ماذا تريدين أيتها الصغيرة؟', 'What would you like, little one?'),
        L(MOTHER, 'معذرة أيتها الناقة المباركة، لقد غافلتني الشقيّة وجاءت إلى هنا.', 'Forgive me, blessed camel — the little rascal slipped away from me and came here.'),
        L(NAQA, 'اتركيها، لعلّها جائعة.', 'Leave her — perhaps she is hungry.'),
        L(MOTHER, 'ولكن اليوم موعد إرضاع وليدك، وهي قد شربت من لبنك الطيب بالأمس حتى شبعت.', "But today is your calf's day to nurse — and she drank your good milk yesterday till she was full."),
        L(NAQA, 'لا عليكِ، دعيها تقترب.', "Never mind — let her come close."),
        L(MOTHER, 'كم أنتِ طيبة وكريمة يا ناقة الله! تؤثرين أطفالنا على ابنك الرضيع. ليحفظكِ الله. إن كل بيت في ثمود يدعو لكِ بالخير.',
          "How kind and generous you are, she-camel of God! You put our children before your own nursing calf. May God keep you. Every house in Thamūd prays for your good."),
        L(MOTHER, 'كنّا نعيش قبلك حياة صعبة؛ فبرغم ما تَرَيْن من قصور كبيرة وبيوت منحوتة في الجبال، إلا أن الفقراء لا يجدون قوتهم. آه، لقد نامت الصغيرة! الحمد لله. بارك الله فيكِ، آسفة، أزعجتكِ بحديثي.',
          "Before you came, life was hard. For all the great palaces you see, and the houses carved in the mountains, the poor could not find their daily bread. Oh — the little one's asleep! Praise be to God. God bless you — I'm sorry, I've bothered you with my chatter.",
          caption('ترينا … ام لقد نامت', 'تَرَيْن … آه، لقد نامت')),
        L(NAQA, 'تعالي في أي وقت تجوع فيه الصغيرة. والآن، دورك يا حبيبي.', "Come any time the little one is hungry. And now — your turn, my darling.", '[إلى وليدها | to her calf]'),
    ]),
    dict(title_ar='المشهد الخامس — عند النهر', title_en='Scene 5 — At the River',
         icon='water.waves', era='past',
         summary_en="The wicked wait for a riot at the water. There isn't one.",
         lines=[
        L(None, 'جميعاً إلى النهر، لنشرب مع العبيد والبهائم!', "Everyone to the river — let's drink with the slaves and the cattle!", '[بسخرية | mocking] · ' + UNNAMED),
        L(None, 'أراهنكم أن الماء لن يكفي الجميع، وستحدث مذبحة حول النهر.', "I bet you the water won't be enough for everyone — there'll be a massacre at the river."),
        L(None, 'أتمنّى ذلك! أنا لم أبِع زجاجة خمر واحدة بالأمس؛ الكل شرب من لبن الناقة وارتوى، ولم يعد أحد يفكر في الشراء مني.',
          "I hope so! I didn't sell a single bottle of wine yesterday — everyone drank the camel's milk and had their fill, and nobody thinks of buying from me any more.",
          caption('لم ابيع', 'لم أبِع') + ' · تاجر الخمر على ما يبدو | the wine-merchant, it seems'),
        L(None, 'عندما نجد الزحام عند الماء، لا بدّ أن نتحدث مع صالح بقوة وحسم.', 'When we find the crush at the water, we must speak to Ṣāliḥ firmly and decisively.'),
        L(None, 'ما هذا أيها الناس؟', "What's this, people?"),
        L(None, 'لقد شربوا جميعاً وارتووا بفضل الله.', "They've all drunk their fill, by the grace of God.", UNNAMED),
        L(None, 'كيف؟ ألم تحدث معارك بسبب الزحام؟', "How? Weren't there fights over the crowding?"),
        L(None, 'لقد نظّم سيدنا صالح الناس، فشربوا جميعاً ثم انصرفوا. نحن آخر الشاربين. النهر أمامكم، تفضّلوا.',
          "Our master Ṣāliḥ put the people in order: they all drank, then went home. We're the last to drink. The river is yours — go ahead."),
        L(None, 'كيف استطاع صالح أن ينظّم قوم ثمود؟ وكيف أجبرهم على طاعته دون استخدام للقوة؟', 'How did Ṣāliḥ manage to bring order to the people of Thamūd? How did he make them obey him without using force?',
          caption('الصالح', 'صالح')),
        L(NAQA, 'يجب أن أشرب الكثير من الماء حتى أُدِرّ لبناً يكفي أهل ثمود جميعاً، كبارهم وصغارهم.',
          'I must drink a great deal of water, so my milk will flow enough for all the people of Thamūd, young and old.'),
        L(GUIDE, 'وأوحى الله إلى نبيّه أن تشرب الناقة في يوم وتسقي الناس اللبن، وفي اليوم الآخر يشرب الناس من النهر بينما تُرضع الناقة وليدها.',
          'And God revealed to His prophet: on one day the she-camel drinks and gives the people milk; on the other, the people drink from the river while the she-camel nurses her calf.'),
    ]),
    dict(title_ar='المشهد السادس — آلهة بأرخص الأسعار', title_en='Scene 6 — Gods at Bargain Prices',
         icon='cart.fill', era='past',
         summary_en='Buy two gods, get the third free — and still nobody buys.',
         lines=[
        L(HAWKER, 'تماثيل الآلهة المقدسة! اغتنم الفرصة: أفضل الآلهة بأرخص الأسعار! اشترِ إلهين واحصل على الثالث هديّة! تماثيل الآلهة المقدسة!',
          'Statues of the holy gods! Seize the chance — the finest gods at the lowest prices! Buy two gods and get the third one free! Statues of the holy gods!'),
        L(HAWKER, 'اشترِ مني هذا الإله يا سيدي، إنه يسمح لك بارتكاب كل المعاصي والشرور!', "Buy this god from me, sir — he lets you commit every sin and wickedness you like!"),
        L(None, 'تبيع الأصنام أمام مصلّى النبي صالح عليه السلام؟ أجُننت يا رجل؟', "You're selling idols in front of the Prophet Ṣāliḥ's prayer-place? Have you gone mad, man?", UNNAMED),
        L(HAWKER, 'يبدو ذلك؛ لم أنجح في بيع إله واحد.', "It seems so — I haven't managed to sell a single god."),
        L(HAWKER, 'لا أحد يريد الشراء يا سيدي.', 'Nobody wants to buy, sir.'),
        L(MERCHANT, 'حاول مرة أخرى. أجبِرهم على الشراء لو لزم الأمر.', 'Try again. Make them buy, if you have to.', caption('لو لازم لزم', 'لو لزم')),
        L(HAWKER, 'سيدي، إنني جائع، لم آخذ أجري منك منذ زمن طويل.', "Sir, I'm hungry — you haven't paid me in a long time."),
        L(MERCHANT, 'خذ هذا الإله أجراً لك.', 'Take this god as your wages.'),
        L(HAWKER, 'وماذا أفعل به؟ إنه مجرد صنم، لا يضرّ ولا ينفع.', "And what would I do with it? It's only an idol — it can neither harm nor help."),
    ]),
    dict(title_ar='المشهد السابع — التسعة', title_en='Scene 7 — The Nine',
         icon='exclamationmark.triangle.fill', era='past',
         summary_en='The lords of Thamūd, ruined by peace, decide the she-camel must die — and who will do it.',
         lines=[
        L(MERCHANT, 'إن الموقف يزداد سوءاً يا سادة… عفواً، أقصد: يا من كنتم سادة ثمود!', "Things are getting worse, gentlemen — forgive me, I mean: you who used to be the lords of Thamūd!"),
        L(None, 'هل دعوتنا لتسخر منا؟', 'Did you invite us here to mock us?', caption('لتسخر خر', 'لتسخر')),
        L(MERCHANT, 'بل لأُعيد إليكم هيبتكم ومجدكم القديم.', 'No — to give you back your standing and your old glory.', caption('بلعيد', 'بل لأُعيد')),
        L(None, 'وهل هذا ممكن؟ إن دين صالح ينتشر في الأرض ويدمّر مصالحنا.', "And is that possible? Ṣāliḥ's religion is spreading through the land and destroying our interests.", caption('الصالح', 'صالح')),
        L(BUILDER, 'معك حق. الناس لم تعد تهتم بشراء البيوت الكبيرة الفخمة؛ علّمهم صالح الزهد في الحياة وانتظار الآخرة.',
          "You're right. People don't care about buying grand, splendid houses any more — Ṣāliḥ has taught them to want little of this life and to wait for the next."),
        L(MERCHANT, 'وكذلك الأصنام، لا أحد يشتريها، بل وصل الأمر إلى سخرية الناس منها.', "The same with idols — no one buys them. It's come to the point where people laugh at them."),
        L(None, 'حتى سموم الثعابين والعقارب ركد سوقها؛ الكل يعيش في سلام، ولا أحد يضع السمّ في خنجر، أو حتى في إناء من العسل!',
          "Even the market in snake and scorpion venom has dried up. Everyone lives in peace — nobody puts poison on a dagger any more, or even in a jar of honey!",
          'تاجر السموم على ما يبدو | the poison-dealer, it seems'),
        L(None, 'هذه الناقة هي سبب كل المشاكل؛ منذ أن جاءت إلى أرضنا لم تجلب لنا إلا الخراب. ليتها تتحجّر وترجع إلى الجبل حيث… أو تموت، ونتخلّص من أمرها!',
          "This camel is the cause of all our troubles. Since she came to our land she has brought us nothing but ruin. If only she'd turn to stone and go back into the mountain where… or die, and be done with!",
          'ينقطع الكلام بعد «حيث» | the speech breaks off after «where»'),
        L(None, 'آه! هذا هو الحل: يجب أن نقتل الناقة! ها… لماذا لا تنطقون؟', "Ah! That's the answer: we must kill the camel! Well… why don't you say something?",
          caption('تنثقون', 'تنطقون')),
        L(None, 'إن قتل الناقة فيه تحدٍّ للنبي صالح، وهذا أمر خطير.', 'Killing the camel is a challenge to the Prophet Ṣāliḥ — a dangerous thing.'),
        L(None, 'أنا أوافق على قتل الناقة، ولكن من يقتلها؟', 'I agree to killing the camel — but who will kill her?'),
        L(None, 'عندي الرجل المناسب.', "I have just the man."),
        L(None, 'مَن؟', 'Who?'),
        L(None, 'إن لنا صاحباً إذا شرب الخمر فقد عقله وصار كالمجانين؛ ولعلّه إذا تعاطى عقر الناقة وأنهى هذه المشكلة.',
          "We have a friend who loses his mind when he drinks — he's like a madman. Perhaps, once he's had his drink, he'll hamstring the camel and put an end to this problem.",
          caption('هالمشكله', 'هذه المشكلة') + ' — «تعاطى … عقر» صدى لقوله تعالى: ﴿فَتَعَاطَىٰ فَعَقَرَ﴾ القمر ٥٤:٢٩ | echoes Qur\'an 54:29'),
        L(None, 'أحسنت الرأي، أحسنت! لِنُعطِه خمراً حتى ينسى نفسه، ثم نعطه سيفاً حادّاً، ونتركه يُكمل المهمّة.',
          "Well thought, well done! Let's give him wine till he forgets himself, then give him a sharp sword, and leave him to finish the job."),
    ]),
    dict(title_ar='المشهد الثامن — التحذير', title_en='Scene 8 — The Warning',
         icon='exclamationmark.bubble.fill', era='past',
         summary_en='Someone runs to warn her. She will not leave her nursing calf.',
         lines=[
        L(None, 'ماذا بكِ؟ انهضي سريعاً، هيا!', "What's wrong with you? Get up, quickly — come on!", UNNAMED),
        L(NAQA, 'لا يمكن أن أنهض، إنني أُرضع صغيري.', "I can't get up — I'm nursing my little one."),
        L(None, 'أنتِ في خطر شديد!', "You're in terrible danger!"),
        L(NAQA, 'سأكون في خطر أشدّ لو لم أقم بواجبي نحو صغيري.', "I'd be in worse danger if I failed my duty to my little one."),
        L(None, 'اسمعيني جيداً: إنهم يريدون قتلك!', 'Listen to me carefully — they mean to kill you!'),
        L(NAQA, 'مَن هم؟', 'Who are they?'),
        L(None, 'تسعة من الأشرار، يفسدون في الأرض ولا يصلحون. لقد تعاطى صاحبهم، وحمل السيف في يده، وهو قادم إليك.',
          "Nine wicked men, who spread corruption in the land and set nothing right. Their friend has had his drink, taken the sword in his hand, and he's coming for you.",
          'صدى لقوله تعالى: ﴿وَكَانَ فِي الْمَدِينَةِ تِسْعَةُ رَهْطٍ يُفْسِدُونَ فِي الْأَرْضِ وَلَا يُصْلِحُونَ﴾ النمل ٢٧:٤٨ | echoes Qur\'an 27:48'),
        L(NAQA, 'يفعل الله ما يريد.', 'God does what He wills.'),
        L(None, 'ألن تهربي؟', "Won't you run?", caption('الن', 'ألن')),
        L(NAQA, 'كيف أهرب من قضاء الله؟', "How could I run from what God has decreed?"),
    ]),
    dict(title_ar='المشهد التاسع — آيةٌ في كل يوم', title_en='Scene 9 — A Sign Every Day',
         icon='heart.slash.fill', era='past',
         summary_en='She smiles at her killer, reminds him of every sign — and comforts her calf.',
         lines=[
        L(KILLER, 'كيف تجلسين هكذا في سلام؟ إنني قاتلك! لماذا تبتسمين؟', "How can you sit there so peacefully? I'm your killer! Why are you smiling?"),
        L(NAQA, 'ولماذا تريد أن تقتلني؟', 'And why do you want to kill me?', caption('ان قتلي', 'أن تقتلني')),
        L(KILLER, 'لقد أفسدتِ حياتنا.', "You've ruined our lives."),
        L(NAQA, 'هذا غير صحيح؛ كانت حياتكم فاسدة، فأصلحها نبيّ الله صالح، وكنت أنا الدليل على نبوّته: ميلادي آية، وولادتي آية ثانية، وإطعامي لكم آية في كل يوم.',
          "That isn't true. Your lives were corrupt, and God's prophet Ṣāliḥ set them right — and I was the proof of his prophethood: my birth a sign, my giving birth a second sign, and my feeding you a sign every single day."),
        L(NAQA, 'لقد سقيتكم اللبن ولم أكن أعرفكم، وقاسمتكم رزق ابني الرضيع، فشبعتم وارتويتم من فضل الله. فهل بهذه الطريقة تحمدون الله على فضله؟',
          "I gave you milk when I didn't even know you; I shared my nursing son's portion with you, and you ate and drank your fill of God's bounty. Is this how you thank God for His bounty?",
          caption('قسمتكم رزق ابن', 'قاسمتكم رزق ابني')),
        L(KILLER, 'كلامك لن يفيد، ولا بدّ أن أذبحك.', "Your talk won't help. I have to kill you."),
        L(NAQA, 'إن معنى ذبحي يشبه معنى ذبح البراءة على…', 'Killing me would mean the same as slaughtering innocence on…', 'ينقطع الكلام | cut off'),
        L(KILLER, 'اصمتي! قلت لكِ اصمتي!', 'Be quiet! I said be quiet!', caption('اسمطي', 'اصمتي')),
        L(CALF, 'أمّي، ماذا بكِ؟', "Mother — what's wrong?"),
        L(NAQA, 'لا تخف يا حبيبي، وافرح لي: إنني الآن أتخلّص من سجن الجسد، وأنتقل إلى عالم أجمل، عالم يخلو من الشر ومن الظلم ومن الفساد، كل ما فيه صالح، مثل نبيّ الله الكريم.',
          "Don't be afraid, my darling — be glad for me. I'm leaving the prison of the body now, going to a lovelier world: a world with no evil, no injustice, no corruption, where everything is good — like God's noble prophet.",
          caption('لا تخاف', 'لا تخف') + ' · «صالح» هنا تورية: الصالح، واسم النبي | «ṣāliḥ» here is both "good" and the Prophet\'s name'),
        L(NAQA, 'ألا تحبّ لأمّك الخير؟ لا تبكِ يا صغير، وابتسم.', "Don't you want good things for your mother? Don't cry, little one — smile.",
          caption('الا تحب امك', 'ألا تحبّ لأمّك')),
    ]),
    dict(title_ar='المشهد العاشر — ثلاثة أيام', title_en='Scene 10 — Three Days',
         icon='hourglass.bottomhalf.filled', era='past',
         summary_en="The nine toast their 'hero'. The believers walk away from Thamūd for three days — then hear the cry.",
         lines=[
        L(None, 'أنا لا أصدّق ما حدث من نبيّهم صالح. لقد قال لنا: «تمتّعوا في داركم ثلاثة أيام، ذلك وعدٌ غير مكذوب.»',
          "I can't believe what their prophet Ṣāliḥ did. He told us: 'Enjoy yourselves in your homes for three days — that is a promise that will not be belied.'",
          "صدى لقوله تعالى: ﴿تَمَتَّعُوا فِي دَارِكُمْ ثَلَاثَةَ أَيَّامٍ ۖ ذَٰلِكَ وَعْدٌ غَيْرُ مَكْذُوبٍ﴾ هود ١١:٦٥ | echoes Qur'an 11:65"),
        L(None, 'وما معنى كلامه هذا؟', 'And what does he mean by that?'),
        L(None, 'ربما يحتاج إلى ثلاثة أيام ليجيّش الجيوش ضدنا.', 'Perhaps he needs three days to raise armies against us.'),
        L(None, 'لو كان ينوي القتال لقاتلنا على الفور، مستفيداً من غضب قومه وحسرتهم على الناقة الذبيحة. بعد ثلاثة أيام يكون الناس قد نسوا كل شيء عن مقتل الناقة، وعادت إلينا القوة والسلطة، وملكنا زمام الأمور.',
          "If he meant to fight, he'd have fought us at once, while his people were angry and grieving for the slaughtered camel. In three days people will have forgotten all about the camel's killing — and power and authority will be ours again, the reins back in our hands."),
        L(None, 'سمعت أن صالحاً سيترك الأرض ويرحل.', "I hear Ṣāliḥ is leaving the land."),
        L(None, 'هذا اعتراف بالهزيمة.', "That's an admission of defeat."),
        L(None, 'نعم، خسر صالح، ولا يدري ماذا يقول.', "Yes — Ṣāliḥ has lost, and doesn't know what he's saying."),
        L(None, 'لنحتفل إذاً بالنصر، وبتخلّصنا من الناقة ومن صالح. ولنشرب نخب البطل، ذابح الناقة!',
          "Then let's celebrate our victory, and being rid of the camel and of Ṣāliḥ! Let's drink to the hero — the camel's slayer!"),
        L(None, 'إننا نسير منذ ثلاثة أيام، لقد حلّ بنا التعب.', "We've been walking for three days — we're worn out.", '[المؤمنون يرحلون مع صالح | the believers, leaving with Ṣāliḥ]'),
        L(None, 'إن أوامر النبي صالح أن نستمر في السير بأسرع ما نستطيع.', "The Prophet Ṣāliḥ's orders are that we keep walking as fast as we can."),
        L(None, 'ما هذه الصيحة المفزعة؟!', 'What is that terrifying cry?!'),
        L(None, 'إنها في أرض ثمود. إننا نسمعها على مسيرة ثلاثة أيام، فما بال أهل ثمود الآن؟',
          "It's in the land of Thamūd. We can hear it three days' journey away — what must it be for the people of Thamūd now?"),
        L(None, 'إنهم يستحقّون أن تُسوّى بهم الأرض؛ هذا جزاء عملهم.', 'They deserve to be levelled with the earth. This is the reward of what they did.'),
    ]),
    dict(title_ar='المشهد الحادي عشر — كهشيم المحتظر', title_en='Scene 11 — Like Straw in a Pen',
         icon='wind', era='present',
         summary_en="The Qur'an tells the end of Thamūd; the little camel's foot has healed.",
         lines=[
        L(NARR, 'إِنَّا مُرْسِلُو النَّاقَةِ فِتْنَةً لَّهُمْ فَارْتَقِبْهُمْ وَاصْطَبِرْ', 'We are sending the she-camel as a trial for them — so watch them, and be patient.', qamar(27)),
        L(NARR, 'وَنَبِّئْهُمْ أَنَّ الْمَاءَ قِسْمَةٌ بَيْنَهُمْ ۖ كُلُّ شِرْبٍ مُّحْتَضَرٌ', 'And tell them the water is to be shared between them: each drinking in its turn, attended.', qamar(28)),
        L(NARR, 'فَنَادَوْا صَاحِبَهُمْ فَتَعَاطَىٰ فَعَقَرَ', 'But they called their companion; he took it in hand, and hamstrung her.', qamar(29)),
        L(NARR, 'فَكَيْفَ كَانَ عَذَابِي وَنُذُرِ', 'Then how were My punishment and My warnings!', qamar(30)),
        L(NARR, 'إِنَّا أَرْسَلْنَا عَلَيْهِمْ صَيْحَةً وَاحِدَةً فَكَانُوا كَهَشِيمِ الْمُحْتَظِرِ', 'We sent upon them a single cry, and they became like the crumbled straw of one who builds a pen.', qamar(31)),
        L(NARR, 'صدق الله العظيم.', 'God Almighty has spoken the truth.'),
        L(GUIDE, 'نعم، أصبحوا كهشيم المحتظر؛ أي أنهم تحوّلوا إلى ما يشبه فُتات القشّ الذي يُفرش في حظائر الحيوانات. وأصبحوا — بسلطانهم وقوّتهم ومالهم — مثل هذا القشّ الصغير الذي يحمله الهواء حيث يريد.',
          "Yes — they became 'like the straw of the pen-maker': turned into something like the scraps of straw spread on the floor of an animals' pen. With all their power, their strength and their wealth, they became like this little bit of straw, carried off by the wind wherever it pleases.",
          caption('فتاه القش … حضائر', 'فُتات القش … حظائر')),
        L(GUIDE, 'أرى أن قدمك قد طابت وعادت إلى طبيعتها. حمداً لله على سلامتك يا صغيرتي.', "I see your foot has healed and is itself again. Thank God you're well, my little one."),
        L(GUIDE, 'هيا، اصبري وتحمّلي كما تتحمّل النوق والجمال الأصيلة، واستمرّي في طريقك، وأدّي رسالتك أنتِ أيضاً، في رضاً وسعادة.',
          "Come on — be patient, and bear things the way true-bred camels do. Keep to your road, and carry your own message too, content and happy."),
    ]),
]

for i, s in enumerate(SCENES, 1):
    s['scene_no'] = i

NOTES = (
    "Reconstructed from the raw auto-generated YouTube captions (ar_text_unit.text_ar) alone, by reading the "
    "Arabic: its grammar, the sense of the scene, and the Qur'an the dialogue echoes — al-Naml 27:48 for «the nine "
    "who spread corruption», al-Qamar 54:29 for «تعاطى فعقر», Hūd 11:65 for «تمتعوا في داركم ثلاثة أيام», and "
    "al-Qamar 54:27–31 recited in full from the muṣḥaf. The archive's machine English was not used. Each repaired "
    "caption word is flagged in its line's note with what the captions heard; where the captions break off, that "
    "is marked. Speakers are named where the dialogue makes them plain and left unnamed where it does not. The "
    "English is a fresh translation of the reconstructed Arabic, written as script.")

DOC = dict(
    title_ar='ناقة صالح - ج 2',
    title_en="Ṣāliḥ's She-Camel — Episode 4 (Part 2)",
    series_ar='قصص الحيوان في القرآن', series_en="Animal Stories from the Qur'an", episode=4,
    video_url='https://www.youtube.com/watch?v=zIQF6uu1TVs',
    acq_ref_id='ACQ:YT:zIQF6uu1TVs', source_text_unit_id=UNIT,
    reconstruction_notes=NOTES,
    cast=CAST,
    scenes=[{k: s[k] for k in ('scene_no', 'title_ar', 'title_en', 'icon', 'era', 'summary_en', 'lines')} for s in SCENES],
)

if __name__ == '__main__':
    j = json.dumps(DOC, ensure_ascii=False, separators=(',', ':')).replace("'", "''")
    print(f"UPDATE ar_text_unit SET script_json = '{j}' WHERE id = '{UNIT}';")
