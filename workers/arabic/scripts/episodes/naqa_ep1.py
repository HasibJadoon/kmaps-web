# -*- coding: utf-8 -*-
"""The script of «ناقة صالح — ج 1» (Animal Stories from the Qur'an, ep. 3),
reconstructed from the raw YouTube auto-captions in ar_text_unit.text_ar by
reading the Arabic alone — its grammar, the scene, and the Qur'an it echoes.
The archive's machine English is not used; the English here is translated
fresh from the reconstructed Arabic.

    python3 scripts/episodes/apply.py naqa_ep1
"""
import json

UNIT = 'ARTX:YT-GYFcer3L6xI:1'

GUIDE, LITTLE = 'الحادي', 'الناقة الصغيرة'
OLDMAN, BUILDER, BOY = 'الشيخ المؤمن', 'البنّاء', 'الصبي'
SCHEMER, DOUBTER = 'صاحب الفكرة', 'رفيقهم المتشكك'
NAQA, MERCHANT, NARR = 'ناقة الله', 'كبير تجار الأصنام', 'راوٍ'

CAST = [
    dict(name_ar=GUIDE, name_en='The Cameleer', role_en='leads the caravan, and tells his camels the story', icon='figure.walk'),
    dict(name_ar=LITTLE, name_en='The Little Camel', role_en='a young she-camel with a thorn in her foot', icon='heart.circle.fill'),
    dict(name_ar=OLDMAN, name_en='The Old Believer', role_en='a follower of Ṣāliḥ, new to Thamūd', icon='leaf.fill'),
    dict(name_ar=BUILDER, name_en='The Builder', role_en='carves the palaces of Thamūd', icon='hammer.fill'),
    dict(name_ar=BOY, name_en='The Boy', role_en='serves at the inn, and hides his faith', icon='figure.child'),
    dict(name_ar=SCHEMER, name_en='The Schemer', role_en='dared Ṣāliḥ to bring a camel out of the rock', icon='lightbulb.fill'),
    dict(name_ar=DOUBTER, name_en='The Doubter', role_en='the one in the gang who stops laughing', icon='questionmark.circle.fill'),
    dict(name_ar=NAQA, name_en="God's She-Camel", role_en='born of the mountain — a sign', icon='sparkles'),
    dict(name_ar=MERCHANT, name_en='The Idol-Merchant', role_en='the richest idol-seller in Thamūd', icon='building.columns.fill'),
    dict(name_ar=NARR, name_en='Narrator', role_en='recites the āyah', icon='book.closed.fill'),
]


def L(speaker, ar, en, note=None):
    d = dict(speaker=speaker, ar=ar, en=en)
    if note: d['note'] = note
    return d


def caption(heard, read):
    return f'الأصل في التفريغ: «{heard}» — رُجّحت «{read}» اعتماداً على السياق والنحو'


UNNAMED = 'المتكلم لا يُسمّى | the speaker is unnamed'

SCENES = [
    dict(title_ar='المشهد الأول — على طريق الصحراء', title_en='Scene 1 — On the Desert Road',
         icon='sun.haze.fill', era='present',
         summary_en='A cameleer pulls thorns from a young camel, and offers the caravan a story while she heals.',
         lines=[
        L(GUIDE, 'هل أصابك التعب يا سفينة الصحراء؟ أنا أيضاً تعبت، ولكن لا تخبري أحداً بذلك. لقد اقتربنا من الوصول على كل حال.',
          "Tired, are you, ship of the desert? So am I — but don't tell anyone. We're nearly there, anyway.",
          caption('سفينة في الصحراء', 'سفينة الصحراء') + ' · يحدّث ناقته | to his camel'),
        L(GUIDE, 'توقفي لنرى ماذا حدث للناقة الصغيرة.', "Stop — let's see what's happened to the little one."),
        L(GUIDE, 'ماذا جرى لك؟ آه، لا تحرّكي قدمك. أعرف أنه مؤلم.', "What's the matter with you? Ah — don't move your foot. I know it hurts.",
          caption('لا تحريك قدمك عرف', 'لا تحرّكي قدمك. أعرف')),
        L(GUIDE, 'عندما تكبرين ستدلّك فطرتك على تجنّب الصخور الحادّة والأشواك، وكل مخاطر السفر. لقد كانت الصبّارة مختبئة خلف الرمال.',
          "When you're grown, your instinct will teach you to keep clear of sharp rocks and thorns, and every danger of the road. That cactus was hiding behind the sand.",
          caption('الصهور … الصفر', 'الصخور … السفر')),
        L(GUIDE, 'أحياناً تفاجئنا الحياة بأشواك غير ظاهرة، وشرور مختبئة عن العين. هذه آخر شوكة.',
          'Sometimes life surprises us with thorns we cannot see, and evils hidden from the eye. That was the last thorn.',
          caption('هذه الآخر شوكة', 'هذه آخر شوكة')),
        L(GUIDE, 'اصبري. كانت جدّتك، ناقة سيدنا صالح عليه السلام، مثلاً أعلى في الصبر وتحمّل البلاء؛ كانت تبتسم راضية في أصعب المواقف وأشدّها ظلماً.',
          "Be patient. Your grandmother — the she-camel of our master Ṣāliḥ, peace be upon him — was the very model of patience under trial. She smiled, content, through the hardest and most unjust of times.",
          caption('اصبره … مثلا أعلى', 'اصبري … مثلاً أعلى')),
        L(GUIDE, 'هل أحكي لك حكايتها؟ اجلسوا يا أصحاب، سنأخذ قسطاً من الراحة حتى تتعافى أختكم الصغيرة.',
          "Shall I tell you her story? Sit down, friends — we'll rest a while until your little sister is well again.",
          caption('سنأخذ قصة من الراحة', 'سنأخذ قسطاً من الراحة') + ' · يخاطب الإبل | to the camels'),
    ]),
    dict(title_ar='المشهد الثاني — ثمود', title_en='Scene 2 — Thamūd',
         icon='mountain.2.fill', era='past',
         summary_en='A people who carved palaces from the mountains — and the prophet sent to them.',
         lines=[
        L(GUIDE, 'في قديم الزمان عاش قومٌ ظالمون، هم قوم ثمود. كانوا يعبدون الأصنام، وينحتون من الجبال بيوتاً ويجعلونها قصوراً فارهة.',
          'Long ago there lived an unjust people: the people of Thamūd. They worshipped idols, and carved houses out of the mountains and made them into lavish palaces.',
          caption('فارئا', 'فارهة') + ' — صدى لقوله تعالى: ﴿وَتَنْحِتُونَ مِنَ الْجِبَالِ بُيُوتًا فَارِهِينَ﴾ الشعراء ٢٦:١٤٩ | echoes Qur\'an 26:149'),
        L(GUIDE, 'ثم شاء الله تعالى أن يبعث نبيّاً إلى ثمود، اصطفى منهم أكثرهم توحيداً ونقاءً وصلاحاً. كان اسمه يحمل حقيقة جوهره: صالح. هذا كان اسمه.',
          "Then God willed to send Thamūd a prophet. He chose from among them the one most devoted to Him alone, the purest and most upright. His name carried the truth of what he was: Ṣāliḥ — 'the righteous'. That was his name."),
        L(GUIDE, 'لكن أغلب قوم ثمود خالفوا نبيّهم ولم يصدّقوه.', 'But most of Thamūd opposed their prophet and would not believe him.',
          caption('ثامود خالف', 'ثمود خالفوا')),
    ]),
    dict(title_ar='المشهد الثالث — البنّاء', title_en='Scene 3 — The Builder',
         icon='hammer.fill', era='past',
         summary_en='A stranger asks a builder of palaces for a small room — and learns why Thamūd hates Ṣāliḥ.',
         lines=[
        L(OLDMAN, 'السلام عليك أيها البنّاء الطيب.', 'Peace be upon you, good builder.'),
        L(BUILDER, 'نعم؟ ماذا تريد؟', 'Yes? What do you want?'),
        L(OLDMAN, 'أقول: السلام عليك.', 'I said: peace be upon you.'),
        L(BUILDER, 'ليس لديّ وقت لردّ التحية، إنني مشغول كما ترى. إذا كنت متسوّلاً فاذهب إلى مكان آخر. هيا!',
          "I've no time to return greetings — I'm busy, as you can see. If you're a beggar, go somewhere else. Go on!"),
        L(OLDMAN, 'إنني لا أتسوّل من أحد، ولا أريد شيئاً من يد مخلوق. عندي ما يكفيني، والحمد لله.',
          "I beg from no one, and want nothing from any creature's hand. I have what I need, praise be to God."),
        L(BUILDER, 'معذرة، ملابسك لا توحي بالثراء.', "Pardon me — your clothes don't suggest wealth.", caption('بالثراط', 'بالثراء')),
        L(OLDMAN, 'لا دخل لك بملابسي. سمعت أنك تبني البيوت في أرض ثمود، هل هذا صحيح؟',
          'My clothes are no business of yours. I hear you build houses in the land of Thamūd — is that so?'),
        L(BUILDER, 'نعم، لديّ أفضل القصور في تلك الناحية.', 'Yes — I have the finest palaces in these parts.'),
        L(OLDMAN, 'لا أريد قصراً.', "I don't want a palace."),
        L(BUILDER, 'عرفت طلبك: تريد أن ننحت لك بيتاً خاصاً في الجبل، فتنظر إلى الناس من أعلى.',
          'I know what you want: a house of your own carved high in the mountain, so you can look down on people.'),
        L(OLDMAN, 'ما هذا التفكير المريض؟ أريد بيتاً عادياً. إنني أعيش وحدي، ولا أحتاج إلا غرفة صغيرة، ومكاناً أغتسل فيه قبل أن أحضر دروس سيدنا صالح عليه السلام.',
          'What a sick way of thinking! I want an ordinary house. I live alone; all I need is a small room, and somewhere to wash before I go to the lessons of our master Ṣāliḥ, peace be upon him.',
          caption('ويتا', 'بيتاً')),
        L(BUILDER, 'إذاً أنت من أتباع صالح!', "So you're one of Ṣāliḥ's followers!", caption('أدباع', 'أتباع')),
        L(OLDMAN, 'نعم، ولي الشرف.', "I am — and it's my honour."),
        L(BUILDER, 'وقد ملأ صالح أرضنا بالفقراء والضعفاء، طلاب الحكمة والموعظة!', 'And Ṣāliḥ has filled our land with the poor and the weak — seekers of wisdom and sermons!'),
        L(BUILDER, 'اسمع أيها الرجل: ما دمت من أتباع صالح فلن تجد من يبيع لك بيتاً في أرض ثمود. اسمع نصيحتي، وعُد من حيث أتيت.',
          "Listen, man: as long as you follow Ṣāliḥ, you won't find anyone in the land of Thamūd to sell you a house. Take my advice and go back where you came from."),
        L(OLDMAN, 'كيف أعود وقد وجدت نفسي أخيراً باتّباع النبي الكريم؟ لماذا تعادون نبيّكم؟',
          'How could I go back, when at last I have found myself by following the noble Prophet? Why are you hostile to your own prophet?'),
        L(BUILDER, 'نحن لا نعاديه. لقد كان فينا مرجوّاً قبل هذا؛ كان من سادة القوم، بل كنّا نؤهّله لقيادتنا. هو في الحقيقة من أصحاب العقل الراجح والخلق الكريم.',
          'We are not his enemies. He was our great hope before this — one of the leading men; we were grooming him to lead us. In truth, he is a man of sound mind and noble character.',
          'صدى لقوله تعالى: ﴿قَدْ كُنتَ فِينَا مَرْجُوًّا قَبْلَ هَٰذَا﴾ هود ١١:٦٢ | echoes Qur\'an 11:62'),
        L(BUILDER, 'لكنه في الأيام الأخيرة فاجأنا بدعوته لعبادة الله الواحد، وترك ما كان يعبد آباؤنا من أصنام.',
          'But lately he took us by surprise, calling us to worship the one God and abandon the idols our fathers worshipped.'),
        L(OLDMAN, 'المفروض أن يزيد قدره بينكم بعد أن دعاكم إلى الحق.', 'Surely he should stand higher among you, now that he has called you to the truth.'),
        L(BUILDER, 'وماذا نفعل بالأصنام؟ إنها تاريخ الآباء والأجداد. وإننا نبيع الأصنام للقبائل المجاورة أيضاً.',
          "And what would we do with the idols? They're the history of our fathers and forefathers. Besides, we sell idols to the neighbouring tribes too."),
        L(OLDMAN, 'إذاً أنتم تعبدون مصالحكم وتجارتكم. لا حول ولا قوة إلا بالله. سأذهب لأبحث عن مكان أبيت فيه.',
          "Then it's your interests and your trade you worship. There is no power and no strength except in God. I'll go and look for somewhere to spend the night."),
        L(BUILDER, 'هناك نُزُلٌ يستقبل الغرباء في آخر المدينة، وفيه حظيرة للخيول والماشية؛ قد تجد فيها مكاناً لك.',
          "There's an inn that takes in strangers at the far end of town, with a stable for horses and cattle. You might find a place there.",
          caption('وفي حضيرة', 'وفيه حظيرة')),
    ]),
    dict(title_ar='المشهد الرابع — الحظيرة', title_en='Scene 4 — The Stable',
         icon='moon.fill', era='past',
         summary_en='The only place in town without an idol — and a boy who believes in secret.',
         lines=[
        L(BOY, 'هل أنت متأكد يا سيدي أن المكان يناسبك؟', 'Are you sure this place suits you, sir?'),
        L(OLDMAN, 'نعم. هذه الحظيرة هي المكان الوحيد الخالي من الأصنام، وأستطيع أن أرتاح فيها قليلاً قبل أن أذهب لرؤية سيدي صالح في الصباح.',
          "Yes. This stable is the only place without idols in it, and I can rest here a little before I go to see my master Ṣāliḥ in the morning."),
        L(BOY, 'أنت من أتباع سيدنا صالح عليه السلام؟', 'You follow our master Ṣāliḥ, peace be upon him?', caption('أدعي', 'أتباع')),
        L(OLDMAN, 'نعم يا بنيّ.', 'I do, my son.'),
        L(BOY, 'وأنا أيضاً، ولكني أكتم إيماني؛ لأن النُّزُل الذي أعمل فيه يضمّ مجموعة من المفسدين: عصابةً من اللصوص وقطّاع الطرق.',
          "So do I — but I keep my faith hidden, because the inn where I work is full of corrupt men: a gang of thieves and highway robbers.",
          caption('لأن أصحاب النزل الذي أعمل فيه يضم', 'لأن النُّزُل الذي أعمل فيه يضمّ')),
        L(BOY, 'معذرة يا سيدي، لقد وصل أصحاب المكان، ويجب أن أخدمهم بسرعة، وإلا آذَوني بشدّة.',
          "Forgive me, sir — the men who run this place are back, and I must wait on them quickly, or they'll hurt me badly.",
          caption('مسادي … أذوني', 'يا سيدي … آذَوني')),
    ]),
    dict(title_ar='المشهد الخامس — في النُّزُل', title_en='Scene 5 — At the Inn',
         icon='person.3.fill', era='past',
         summary_en='The gang drinks to the trap they set: let Ṣāliḥ bring a camel out of the rock.',
         lines=[
        L(None, 'أسرع أيها الصبي، وإلا أذقتك طعم هذه العصا الغليظة! أريد شراباً أكثر، هيا!',
          "Hurry up, boy, or you'll get a taste of this thick stick! More drink — come on!",
          caption('أدقتك طعم هذه العصة', 'أذقتك طعم هذه العصا') + ' · ' + UNNAMED),
        L(None, 'يجب أن نحتفل بإحراج صالح وإثبات عجزه أمام الناس.', "We must celebrate — we've shamed Ṣāliḥ and shown everyone he's powerless.", UNNAMED),
        L(SCHEMER, 'لا تنسوا أنها فكرتي أنا! «يا صالح، حتى نصدّقك أخرِج لنا ناقة من قلب الجبل.»',
          "Don't forget it was my idea! 'Ṣāliḥ — if you want us to believe you, bring us a she-camel out of the heart of the mountain.'"),
        L(SCHEMER, 'لقد كان صالح ينظر لنا في دهشة، وأنا قلت له: «هذا الجبل القريب، لماذا لا يلد ناقة؟ لماذا لا تدعو ربك أن ينشقّ الجبل عن ناقة تخرج منه؟»',
          "Ṣāliḥ just stared at us, amazed. And I said to him: 'That mountain there — why shouldn't it give birth to a camel? Why don't you pray to your Lord to split the mountain open and let a camel walk out?'"),
        L(SCHEMER, 'وعندما اتّسعت عيناه أكثر من الدهشة قلت له: «لا تتصوّر يا صالح أننا نقوم بتعجيزك أو الضغط عليك. لا، لكننا نريد أمراً خارقاً لم يحدث من قبل، نريد آية من الله على نبوّتك.» وبالطبع لن يلد الجبل ناقة أبداً!',
          "And when his eyes grew even wider, I told him: 'Don't imagine, Ṣāliḥ, that we're trying to stump you or put pressure on you. No — we just want something extraordinary, something that has never happened: a sign from God that you are His prophet.' And of course, no mountain will ever give birth to a camel!"),
        L(None, 'صاحبنا، لماذا لا تشاركنا الضحك؟', "You there, friend — why aren't you laughing with us?", caption('الضاحك', 'الضحك')),
        L(DOUBTER, 'أخشى أن تكونوا قد ارتكبتم حماقة بهذا الطلب.', "I'm afraid you've done something foolish, asking that."),
        L(None, 'كيف؟', 'How so?'),
        L(DOUBTER, 'إن صالحاً لم يبدُ عليه الارتباك من الطلب، وكأنه قادر على تحقيقه. كان ما يشغله أننا نسيء الأدب مع ربّه، ونطلب برهاناً مادّياً على قدرته. ولكنه بدا واثقاً أنه إذا دعا ربّه فسيلد الجبل ناقة.',
          "Ṣāliḥ wasn't thrown by the request at all — as if he could do it. What troubled him was that we were being insolent towards his Lord, demanding physical proof of His power. But he seemed sure that if he prayed to his Lord, the mountain would give birth to a camel.",
          caption('لم يبدو … بدى … داع … ناقع', 'لم يبدُ … بدا … دعا … ناقة')),
        L(None, 'ما هذا التخريف يا رجل؟ هل سكرت قبل أن تشرب الخمر؟ اسقوا صاحبكم الخمر حتى يعود إلى طبيعته!',
          "What drivel is this, man? Are you drunk before you've even had a drink? Pour your friend some wine till he's himself again!"),
    ]),
    dict(title_ar='المشهد السادس — الكلمات التسع', title_en='Scene 6 — The Nine Words',
         icon='text.quote', era='past',
         summary_en='All Thamūd gathers at the mountain. Nine words were all Ṣāliḥ said.',
         lines=[
        L(BOY, 'أسرع أيها العمّ الطيب! إن أهل ثمود جميعاً ينتظرون عند الجبل الكبير.', 'Hurry, good uncle! All the people of Thamūd are waiting at the great mountain.'),
        L(OLDMAN, 'ما يهمّني في الأمر رجل واحد، هو سيدنا صالح. كيف يستطيع تحمّل هؤلاء القوم والاستماع إليهم؟',
          'Only one man in all this matters to me: our master Ṣāliḥ. How can he bear these people, and listen to them?',
          caption('ما يهموني', 'ما يهمّني')),
        L(BOY, 'هل تعتقد حقاً أن الجبل سيلد ناقة؟', 'Do you really think the mountain will give birth to a camel?', caption('سهل دناقة', 'سيلد ناقة')),
        L(OLDMAN, 'إنني أؤمن بصالح ودعوته، سواءٌ ولد الجبل أم لا. لقد قال سيدنا صالح تسع كلمات فقط، أثارت الدنيا كلها ضدّه:',
          "I believe in Ṣāliḥ and his call whether the mountain gives birth or not. Our master Ṣāliḥ said just nine words — and they set the whole world against him:",
          caption('تسعة كلمات', 'تسع كلمات')),
        L(None, 'يَا قَوْمِ اعْبُدُوا اللَّهَ مَا لَكُم مِّنْ إِلَٰهٍ غَيْرُهُ', 'O my people, worship God — you have no god but Him.',
          "آية قرآنية — سورة هود ١١:٦١ | Qur'an 11:61"),
        L(OLDMAN, 'إن جوهر التوحيد يا بنيّ في هذه الكلمات التسع؛ هي دعوة كل الأنبياء.', "The heart of tawḥīd, my son, is in those nine words. They are the call of every prophet."),
        L(BOY, 'انظر، انظر إلى جموع الناس حول الجبل!', 'Look — look at the crowds around the mountain!'),
        L(OLDMAN, 'غريبٌ أمر الناس: تجمعهم المعجزة، ولا تجمعهم دعوة النبي المرسل.', "How strange people are: a miracle brings them together, and the call of a prophet sent to them does not."),
        L(None, 'اليوم نهاية صالح؛ لن يصدّقه أحد بعد الآن.', "Today is the end of Ṣāliḥ — no one will believe him after this.", UNNAMED),
        L(SCHEMER, 'سأذكّركم دائماً أنني صاحب الفكرة، فكرة أن يلد الجبل ناقة!', "I'll always remind you: it was my idea — a mountain giving birth to a camel!"),
    ]),
    dict(title_ar='المشهد السابع — المولودة من الجبل', title_en='Scene 7 — Born of the Mountain',
         icon='sparkles', era='past',
         summary_en='Something moves at the top of the mountain. The she-camel wakes, and wonders what she is.',
         lines=[
        L(BOY, 'أين سيدنا صالح؟', 'Where is our master Ṣāliḥ?'),
        L(None, 'انظر، انظر! هناك شيء يتحرّك في أعلى الجبل!', "Look, look! Something's moving at the top of the mountain!", UNNAMED),
        L(NAQA, 'أين أنا؟ ومن هؤلاء؟ لماذا ينظرون إليّ بدهشة؟ المفترض أن يسجدوا لله بعد أن رأوا الآية بأعينهم.',
          "Where am I? And who are they? Why are they staring at me in astonishment? They ought to fall down before God, now they've seen the sign with their own eyes.",
          caption('بعينهم', 'بأعينهم')),
        L(NAQA, 'كيف تجد ناقة مثلي حرّيتها في هذا العالم؟ ولكن هل أنا ناقة، أم مجرد صورة لناقة؟',
          'How does a camel like me find her freedom in this world? But am I a camel at all — or only the image of one?'),
        L(NAQA, 'سأحاول تذكّر ما حدث: كنت جزءاً من الصخور، لا أدرك غير أنني صخرة. ثم تحوّلت الصخرة الجامدة إلى لحم ليّن، وتدفّقت الدماء في العروق.',
          'Let me try to remember what happened. I was part of the rock, knowing nothing but that I was stone. Then the lifeless stone turned into soft flesh, and blood came rushing through the veins.'),
        L(NAQA, 'ورغم هذا لا أشعر بالانتماء لعالم الصخور، ولا لعالم الحيوان. لا بدّ أن هناك حكمة ما في خلقي.',
          "And yet I don't feel I belong to the world of stone, nor to the world of animals. There must be some wisdom in the way I was made."),
    ]),
    dict(title_ar='المشهد الثامن — ناقة الله', title_en="Scene 8 — God's She-Camel",
         icon='drop.fill', era='past',
         summary_en='The water is shared, one day hers and one day theirs — and on her day, she gives milk.',
         lines=[
        L(OLDMAN, 'إياكم أن تؤذوا الناقة أو تقفوا في طريقها!', "Don't you dare harm the she-camel, or stand in her way!"),
        L(None, 'من أنت لتأمرنا؟', 'Who are you to give us orders?', UNNAMED),
        L(None, 'اصمت أيها الأحمق! عفواً يا سيدي، إنه لا يعرف أنك من أتباع صالح.', "Shut up, you fool! Forgive him, sir — he doesn't know you're a follower of Ṣāliḥ.", UNNAMED),
        L(OLDMAN, 'تقصد النبي صالحاً عليه السلام؟', 'You mean the Prophet Ṣāliḥ, peace be upon him?'),
        L(None, 'نعم، نعم، بكل تأكيد. هل من أوامر أخرى؟', 'Yes, yes — of course. Any other orders?'),
        L(OLDMAN, 'إنني لا آمر بشيء. أردت فقط أن أذكّركم بما قاله سيدنا صالح عليه السلام: حافظوا على آية الله لكم، واحذروا أن تمسّوها بسوء.',
          "I give no orders. I only wanted to remind you what our master Ṣāliḥ said: guard God's sign to you, and beware of touching her with harm.",
          caption('واحضروا أن تمسوها بسوط', 'واحذروا أن تمسّوها بسوء')),
        L(None, 'سمعاً وطاعة أيها الشيخ الطيب.', 'We hear and obey, good old man.'),
        L(None, 'فوجئنا بميلادك أمس من الجبل.', 'Your birth from the mountain yesterday took us by surprise.', caption('فوجينا', 'فوجئنا') + ' · ' + UNNAMED),
        L(NAQA, 'كان ميلادي مفاجأة لي أنا أيضاً.', 'My birth was a surprise to me too.'),
        L(None, 'سمعت أن الماء سيكون قسمة بيننا وبينك؛ بمعنى أنك ستشربين وحدك في يوم، ونشرب نحن في اليوم الثاني، وفي اليوم الذي تشربين فيه ستسقيننا اللبن.',
          "I've heard the water is to be shared between us and you: you drink alone one day, and we drink the next — and on your day, you'll give us milk to drink."),
        L(None, 'ولكن كيف تعطي الناقة لبناً وهي ما زالت وليدة؟', 'But how can a camel give milk when she was only just born?'),
        L(NAQA, 'أنا لست ناقة عادية، إنما أنتمي إلى آيات الله.', "I'm no ordinary camel — I belong to the signs of God."),
        L(None, 'ولكن هل يكفي لبن ناقة واحدة لسقاية كل هؤلاء الناس؟', "But will one camel's milk be enough for all these people?", caption('لصيقاية', 'لسقاية')),
        L(NAQA, 'لا أعرف إجابة هذا السؤال.', "I don't know the answer to that."),
        L(None, 'أخشى أن نجوع ونظمأ، ولا يجد الضعفاء منّا نصيبهم.', "I'm afraid we'll go hungry and thirsty, and the weak among us won't get their share.",
          caption('أن جوع ونظم', 'أن نجوع ونظمأ')),
        L(NAQA, 'لا تخشَ على رزقك؛ الله هو الذي يُطعم ويسقي. أنا مجرد أداة، أنفّذ أوامر خالقي.',
          "Don't fear for your provision: it is God who feeds and gives drink. I am only an instrument, carrying out my Creator's commands."),
        L(None, 'كم أنتِ لطيفة وطيبة يا… عفواً، ما اسمك؟', "How gentle and kind you are, O… forgive me, what's your name?"),
        L(NAQA, 'البعض يسمّيني ناقة صالح، وهذا يشرّفني. ولكني أحبّ أكثر أن يناديني الناس بناقة الله.',
          "Some call me Ṣāliḥ's she-camel, and that honours me. But I would rather people called me God's she-camel."),
        L(None, 'لقد بُورِكت أرضنا وحياتنا يا ناقة الله. كلّنا هنا نحبّك.', "Our land and our lives have been blessed, she-camel of God. All of us here love you.",
          caption('لقد بركت', 'لقد بُورِكت')),
    ]),
    dict(title_ar='المشهد التاسع — القصر', title_en='Scene 9 — The Palace',
         icon='building.columns.fill', era='past',
         summary_en="Thamūd's merchants of wine, slaves and idols call the gang in: a camel is sharing their water.",
         lines=[
        L(None, 'ماذا تريدون؟', 'What do you want?', 'حارس القصر | the palace guard'),
        L(None, 'لدينا دعوة من صاحب القصر.', 'We have an invitation from the master of the palace.'),
        L(None, 'إذا كنتم قادمين للسرقة فأحذّركم: نحن جميعاً مسلّحون.', "If you've come to steal, I warn you: we're all armed.",
          caption('قادمون للصرقة', 'قادمين للسرقة')),
        L(None, 'لقد أخبرتك أننا ضيوف. كبير تجار الأصنام هو الذي دعانا بنفسه.', 'I told you, we are guests. The chief idol-merchant invited us himself.'),
        L(None, 'دعهم يمرّون.', 'Let them through.'),
        L(MERCHANT, 'أهلاً بكم، الجميع في انتظاركم. سأبدأ بإجراء التعارف: هؤلاء سادة ثمود وتجّارها — كبير تجار الخمور، وكبير تجار العبيد — وأنا، كما تعرفون، أكبر تجار التماثيل والأصنام في ثمود.',
          'Welcome — everyone has been waiting for you. Let me make the introductions: these are the lords and merchants of Thamūd — the chief wine-merchant, and the chief slave-trader — and I, as you know, am the greatest dealer in statues and idols in Thamūd.',
          caption('هؤلاء السادة ثمود', 'هؤلاء سادة ثمود')),
        L(MERCHANT, 'أما هؤلاء الناس فهم أصدقاء لنا، يمثّلون رأي الناس: الأقوياء، أصحاب الكلمة المسموعة.', 'And these people are friends of ours. They speak for public opinion — the strong, the men whose word is heard.'),
        L(None, 'شكراً لك يا سيدي. قل لي: لماذا دعوتنا إلى قصرك؟', 'Thank you, sir. Tell me — why have you invited us to your palace?'),
        L(MERCHANT, 'هذا سؤال مهم. أردت أن أتحدث معكم في أحوال البلاد. لقد كنّا نعيش في قوة وسيادة على أرضنا، ثم فوجئنا بناقة تشاركنا شرب الماء: لها يوم وحدها، ولنا جميعاً اليوم الثاني.',
          "An important question. I wanted to talk with you about the state of the country. We used to live in strength, masters of our own land — and then, out of nowhere, a camel is sharing our water: one day for her alone, and the other day for all of us.",
          caption('انفجئنا', 'فوجئنا')),
        L(MERCHANT, 'أي يشرب السادة والعبيد والبهائم معاً! من أجل أن نُفسح الطريق لمجرد ناقة لتشرب، نظمأ…',
          'Which means lords, slaves and cattle all drinking together! All so that we clear the way for a mere camel to drink, while we go thirsty…',
          caption('الطريقة … ونظم أناح', 'الطريق … نظمأ') + ' — ينقطع الكلام هنا | the speech breaks off here'),
    ]),
    dict(title_ar='المشهد العاشر — آية الله', title_en="Scene 10 — God's Sign",
         icon='moon.stars.fill', era='present',
         summary_en='The Qur\'an tells it; the camels sleep; the cameleer promises the rest tomorrow.',
         lines=[
        L(NARR, 'وَإِلَىٰ ثَمُودَ أَخَاهُمْ صَالِحًا ۗ قَالَ يَا قَوْمِ اعْبُدُوا اللَّهَ مَا لَكُم مِّنْ إِلَٰهٍ غَيْرُهُ ۖ قَدْ جَاءَتْكُم بَيِّنَةٌ مِّن رَّبِّكُمْ ۖ هَٰذِهِ نَاقَةُ اللَّهِ لَكُمْ آيَةً ۖ فَذَرُوهَا تَأْكُلْ فِي أَرْضِ اللَّهِ ۖ وَلَا تَمَسُّوهَا بِسُوءٍ فَيَأْخُذَكُمْ عَذَابٌ أَلِيمٌ',
          "And to Thamūd, their brother Ṣāliḥ. He said: 'O my people, worship God — you have no god but Him. A clear proof has come to you from your Lord: this she-camel of God is a sign for you. So leave her to graze in God's earth, and do not touch her with harm, or a painful punishment will seize you.'",
          "آية قرآنية — سورة الأعراف ٧:٧٣ | Qur'an 7:73"),
        L(NARR, 'صدق الله العظيم.', 'God Almighty has spoken the truth.'),
        L(GUIDE, 'وهكذا قابل الأشرار نعمة الله عليهم بالجحود والنكران.', "And so the wicked met God's favour to them with denial and ingratitude.",
          caption('بالجعود المكرم', 'بالجحود والنكران') + ' — قراءة غير قاطعة | an uncertain reading'),
        L(GUIDE, 'هل نمتِ أنتِ أيضاً يا صغيرة؟ حسناً، أكمل لك في الغد إن شاء الله.', "Have you fallen asleep too, little one? All right — I'll finish it for you tomorrow, God willing."),
        L(None, 'الحمد لله، إن النياق بخير. حاذروا أن توقظوها. سنبيت الليلة هنا، وفي الصباح نستكمل الطريق.',
          "Praise be to God, the camels are all right. Careful not to wake them. We'll spend the night here, and go on in the morning.",
          caption('إن نساقق … توقنوها', 'إن النياق … توقظوها') + ' · من رجال القافلة | one of the caravan men'),
        L(GUIDE, 'نعم، نعم. وأكمل لكم حكاية ناقة صالح عليه السلام.', "Yes, yes — and I'll finish telling you the story of Ṣāliḥ's she-camel, peace be upon him."),
    ]),
]

for i, s in enumerate(SCENES, 1):
    s['scene_no'] = i

NOTES = (
    "Reconstructed from the raw auto-generated YouTube captions (ar_text_unit.text_ar) alone, by reading the "
    "Arabic: its grammar, the sense of the scene, and the Qur'an the dialogue echoes (al-Shuʿarāʾ 26:149 for the "
    "carved palaces, Hūd 11:62 for «كان فينا مرجوّاً», Hūd 11:61 for Ṣāliḥ's nine words, al-Aʿrāf 7:73 recited in "
    "full from the muṣḥaf). The archive's machine English was not used. Each repaired caption word is flagged in "
    "its line's note with what the captions heard; where the captions break off, that is marked. The storyteller "
    "is the caravan's cameleer — he pulls the thorn, calls the camels «أصحاب», and the other men tell him not to "
    "wake them. Speakers are named where the dialogue makes them plain and left unnamed where it does not. The "
    "English is a fresh translation of the reconstructed Arabic, written as script.")

DOC = dict(
    title_ar='ناقة صالح - ج 1',
    title_en="Ṣāliḥ's She-Camel — Episode 3 (Part 1)",
    series_ar='قصص الحيوان في القرآن', series_en="Animal Stories from the Qur'an", episode=3,
    video_url='https://www.youtube.com/watch?v=GYFcer3L6xI',
    acq_ref_id='ACQ:YT:GYFcer3L6xI', source_text_unit_id=UNIT,
    reconstruction_notes=NOTES,
    cast=CAST,
    scenes=[{k: s[k] for k in ('scene_no', 'title_ar', 'title_en', 'icon', 'era', 'summary_en', 'lines')} for s in SCENES],
)

if __name__ == '__main__':
    j = json.dumps(DOC, ensure_ascii=False, separators=(',', ':')).replace("'", "''")
    print(f"UPDATE ar_text_unit SET script_json = '{j}' WHERE id = '{UNIT}';")
