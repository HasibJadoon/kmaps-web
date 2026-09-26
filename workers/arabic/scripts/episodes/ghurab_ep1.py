# -*- coding: utf-8 -*-
"""The script of «غراب ابني آدم — ج 1» (Animal Stories from the Qur'an, ep. 1),
reconstructed from the raw YouTube auto-captions in ar_text_unit.text_ar and
checked sentence by sentence against the archive's English
(meta_json.translation_en), as the Namla episode was.

    python3 scripts/episodes/apply.py ghurab_ep1

The scene `icon`, `era` and `summary_en`, and the `cast` (each speaker's icon),
are what the script view draws its slides from — the view holds no list of
characters or symbols of its own.
"""
import json

UNIT = 'ARTX:YT-eHobRabok1s:1'

CROW, SHEP, CAIN, ABEL = 'الغراب', 'الراعي', 'قابيل', 'هابيل'
GHAR, JAAB, NARR = 'غربو', 'جعبوب', 'راوٍ'

CAST = [
    dict(name_ar=CROW, name_en='The Crow', role_en='tells the story, in the present', icon='bird.fill'),
    dict(name_ar=SHEP, name_en='The Shepherd', role_en='feeds the birds; learns to listen', icon='figure.stand'),
    dict(name_ar=CAIN, name_en='Qābīl (Cain)', role_en="Adam's elder son", icon='flame.fill'),
    dict(name_ar=ABEL, name_en='Hābīl (Abel)', role_en="Adam's younger son", icon='heart.fill'),
    dict(name_ar=GHAR, name_en='Gharbū', role_en="the storyteller's grandfather — a crow who would be judge", icon='scalemass.fill'),
    dict(name_ar=JAAB, name_en='Jaʿbūb', role_en='his brother — a crow who would be a singer', icon='music.note'),
    dict(name_ar=NARR, name_en='Narrator', role_en='recites the āyah', icon='book.closed.fill'),
]


def L(speaker, ar, en, note=None):
    d = dict(speaker=speaker, ar=ar, en=en)
    if note: d['note'] = note
    return d


def caption(heard, read):
    return f'الأصل في التفريغ: «{heard}» — رُجّحت «{read}» اعتماداً على السياق والنحو'


GAP = ('فجوة في التفريغ: يقفز من «ومتلازمان» إلى «ولكنّه هو الخاسر»، والضمير عائد على الشر'
       ' | a gap in the captions: they jump to "but it is the loser" — "it" being evil')

SCENES = [
    dict(title_ar='المشهد الأول — الراعي والغراب', title_en='Scene 1 — The Shepherd and the Crow',
         icon='bird', era='present',
         summary_en='A shepherd feeds the birds and turns a hungry crow away — and the crow answers back.',
         lines=[
        L(SHEP, 'اخفضي صوتك يا حبيبة حتى لا تفزعَ العصافير. خذي الطعام ودعيني أراقب الطيور وهي تبني أعشاشها.',
          "Keep your voice down, dear, so the sparrows don't take fright. Take the food, and let me watch the birds building their nests."),
        L(SHEP, 'الحمد لله الذي أعاننا على إطعامهم؛ فقد أكلوا جميعاً بفضل الله.',
          'Praise be to God, who helped us feed them — every one of them has eaten, by His grace.'),
        L(CROW, 'انتظر أيها الراعي! أنا لم أتناول طعامي بعد.',
          "Wait, shepherd! I haven't eaten yet."),
        L(SHEP, 'لِمَن هذا الصوت المزعج؟', 'Whose is that grating voice?',
          caption('ل هذا الصوت', 'لِمَن هذا الصوت')),
        L(CROW, 'هل أزعجك نعيقي إلى هذا الحد؟ أم أنت تشاءمت منه مثل معظم الجهلاء؟',
          'Does my cawing bother you that much? Or did you take it for a bad omen, like most ignorant people?',
          caption('أنت شهمت', 'أم أنت تشاءمت')),
        L(SHEP, 'أنا لم أقل هذا، معاذ الله! لقد نهانا ديننا عن التشاؤم وتصديق الخرافات.',
          'I never said that — God forbid! Our religion forbids us to read omens or believe in superstitions.'),
        L(CROW, 'مجرد كلام! لا يكاد أحدنا ينعق فوق شجرة إلا ويشعر الناس بالضيق والخوف والتشاؤم.',
          'Just words! One of us barely caws from a tree before people feel uneasy and afraid, sure that something bad is coming.'),
        L(CROW, 'قد يكون صوتنا أقلّ في جماله من صوت البلبل، غير أنه لا يمتّ بنسبٍ إلى الشؤم. الشؤم كلمة إنسانية تنطبق على تصرفات ابن آدم.',
          "Our voice may be less lovely than the nightingale's, but it has nothing to do with bad luck. 'Ill omen' is a human word — it fits the deeds of the sons of Adam.",
          caption('لا يمط ب بنسب', 'لا يمتّ بنسب')),
        L(SHEP, 'شكراً على كل حال!', 'Thanks all the same!'),
        L(CROW, 'العفو، أنا لا أذكر إلا الحقيقة. أحياناً يتصرف الإنسان تصرفاً شريراً، فإذا صرخ الغراب فوق شجرة نسي الإنسان تصرفه، وذكر صوت الغراب، ونسب إليه الشر.',
          "Don't mention it — I only speak the truth. Sometimes a man does something wicked; then a crow calls from a tree, and the man forgets what he did, remembers only the crow's voice, and lays the evil at its door."),
        L(SHEP, 'كفى أيها الغراب! لقد نفد صبري معك، لن أتحمّل المزيد من الإهانة. لماذا تكره الناس إلى هذا الحد؟',
          "Enough, crow! My patience is gone — I won't take any more insults. Why do you hate people so much?"),
        L(CROW, 'قل لي أنت أولاً: لماذا تكرهون الغربان؟', 'You tell me first: why do you all hate crows?'),
        L(SHEP, 'نحن لا نكره مخلوقات الله، ولكننا نكره الطباع السيئة. انصرف! لن أعطيك طعاماً.',
          "We hate none of God's creatures — only bad manners. Off with you! You'll get no food from me."),
        L(CROW, 'ومن قال إنني أحتاج طعامك أيها المسكين؟ أنت الذي تحتاج إلى إطعامي لتنال الثواب، ولن أمنحك شرف إطعامي.',
          "And who says I need your food, poor fellow? It's you who needs to feed me, to earn the reward — and I won't grant you that honour.",
          caption('تحتاج إلى طعامي', 'تحتاج إلى إطعامي')),
        L(SHEP, 'لقد كان الغراب على حق؛ أنا الذي أحتاج إلى إطعامه تقرّباً لله عز وجل، ولم يكن من الأدب أن أمُنّ عليه برزقٍ أعطاه لنا الله.',
          'The crow was right. I am the one who needs to feed him, to draw near to God — and it was ill-mannered to hold over him a provision God gave us.',
          '[يحدّث نفسه | to himself]'),
    ]),
    dict(title_ar='المشهد الثاني — عند النهر', title_en='Scene 2 — By the River',
         icon='water.waves', era='present',
         summary_en='The shepherd comes to apologise, and the crow speaks of what men do to one another.',
         lines=[
        L(CROW, 'يا لك من صيّاد ماهر!', 'What a skilful fisher you are!'),
        L(None, 'ويا لك من شخص مزعج! إن السمك يهرب من صوتك.', 'And what a nuisance you are! The fish flee at the sound of your voice.',
          'المتكلم لا يُسمّى في التفريغ: صيّادٌ عند النهر | the speaker is unnamed — someone fishing at the river'),
        L(CROW, 'معذرة، سألتزم الصمت الآن.', "Sorry — I'll keep quiet now.", caption('سالتزمان', 'سألتزم الصمت الآن')),
        L(CROW, 'ها! ما الذي أتى بك أيها الراعي؟', 'Ha! What brings you here, shepherd?'),
        L(SHEP, 'جئت لأعتذر وأتعلم منك؛ إن في حديثك حكمة رغم حداثة سنّك، وريشك الذي لم يطله الشيب.',
          'I came to apologise, and to learn from you. There is wisdom in your words, young as you are, with feathers no grey has touched.',
          caption('وريش الذي لم يطل', 'وريشك الذي لم يطله')),
        L(CROW, 'يشيب على الأرض كل شيء باستثناء ريش الغراب؛ من رأى ما رأيناه، واحتمل ما احتملنا، لا يشيب مهما رأى بعد ذلك.',
          "Everything on earth turns grey except a crow's feathers. Whoever has seen what we have seen, and borne what we have borne, turns grey at nothing he sees after.",
          caption('لا يسيب', 'لا يشيب')),
        L(SHEP, 'عن أي شيء تتكلم؟', 'What are you talking about?'),
        L(CROW, 'أتكلم عن ظلم الإنسان لأخيه الإنسان.', "I'm talking about the wrong a man does to his brother man."),
        L(SHEP, 'لماذا أنت متحامل على الإنسان هكذا؟', 'Why are you so set against mankind?'),
        L(CROW, 'لست متحاملاً، لكنكم أيها الناس أعجب عجائب الدنيا كلها.', "I'm not set against him — but you people are the strangest wonder in the whole world.",
          caption('لست متحملا', 'لست متحاملاً')),
        L(SHEP, 'كيف؟', 'How so?'),
        L(CROW, 'أنتم تحبون الله وتعصونه، وتكرهون الشيطان وتطيعونه!', 'You love God, and disobey Him; you hate Satan, and obey him!',
          caption('تحبون الله وتعصي وتكرهون الشيطان وتطيع', 'تحبون الله وتعصونه وتكرهون الشيطان وتطيعونه')),
        L(SHEP, 'معك حق. حدّثني عمّا رأيته من ظلم الإنسان لأخيه.', "You're right. Tell me what you have seen of man's wrong to his brother."),
        L(CROW, 'آه، هذه حكاية قديمة، حكاها جدّي الأكبر لأولاده، ونقلوها هم لأولادهم، ومن حفيد إلى حفيد حتى وصلت إليّ.',
          'Ah — this is an old story. My great-grandfather told it to his children, they told it to theirs, and from grandchild to grandchild it came down to me.'),
    ]),
    dict(title_ar='المشهد الثالث — ابنا آدم', title_en="Scene 3 — Adam's Two Sons",
         icon='person.2.fill', era='past',
         summary_en='Long ago, a young crow watches two boys play — and one of them plays too hard.',
         lines=[
        L(CROW, 'كان جدّي غربو يعيش في قديم الزمان، في عصر جدّكم آدم عليه السلام. وكان لآدم ولدان: الأول اسمه قابيل، والآخر اسمه هابيل.',
          'My grandfather Gharbū lived long ago, in the days of your forefather Adam, peace be upon him. Adam had two sons: the first was Qābīl, the other Hābīl.'),
        L(CROW, 'كان قابيل قاسياً لا يحب إلا نفسه، أما هابيل فكان صورةً للطيبة والخير على الأرض.',
          'Qābīl was hard and loved no one but himself; Hābīl was goodness and kindness walking the earth.'),
        L(CROW, 'كان الصغيران يلعبان، ويراقبهما من فوق الشجرة غرابٌ صغير، اسمه — على ما أظن — غربو.',
          'The two boys were playing, and from the top of a tree a little crow was watching them — his name, I believe, was Gharbū.',
          caption('ويراقبه ما', 'ويراقبهما')),
        L(CAIN, 'هابيل!', 'Hābīl!'),
        L(ABEL, 'نعم يا أخي.', 'Yes, brother?'),
        L(CAIN, 'ما رأيك أن نلعب لعبة جديدة؟', 'How about a new game?'),
        L(ABEL, 'أحب اللعب معك يا أخي. هل نجري ونتسابق؟', 'I love playing with you, brother. Shall we run a race?'),
        L(CAIN, 'لا، سنلعب لعبة جديدة مسلّية جداً: لعبة الصياد والفريسة. سأقوم أنا بدور الصياد، وأنت — لأنك الأصغر — ستقوم بدور الفريسة.',
          "No — a new game, a really fun one: hunter and prey. I'll be the hunter, and you, since you're the youngest, will be the prey."),
        L(ABEL, 'حسناً، حاول أن تمسكني!', 'All right — try and catch me!'),
        L(CAIN, 'سألتهم لحم الفريسة!', "I'll devour the prey!"),
        L(ABEL, 'آه! قابيل، لقد آلمتني!', 'Ow! Qābīl, you hurt me!'),
        L(CAIN, 'هذه أصول اللعبة. هل تريد أن يحضن الصياد فريسته ويربّت عليها؟',
          'Those are the rules. Do you want the hunter to hug his prey and pat it on the back?'),
        L(ABEL, 'آه… انظر يا أخي، إن دمي يسيل!', "Ah… look, brother — I'm bleeding!"),
        L(CAIN, 'أنت المسؤول؛ لقد اخترت بنفسك دور الفريسة.', 'Your own fault — you chose to be the prey.'),
    ]),
    dict(title_ar='المشهد الرابع — في عشّ الغربان', title_en="Scene 4 — In the Crows' Nest",
         icon='graduationcap.fill', era='past',
         summary_en='Gharbū should be at his lessons; Jaʿbūb would rather sing.',
         lines=[
        L(None, 'غربو، إلى أي شيء تنظر؟', 'Gharbū, what are you looking at?',
          caption('ربوب', 'غربو') + ' · المتكلم لا يُسمّى | the speaker is unnamed'),
        L(GHAR, 'إنهما قابيل وهابيل، ولدا آدم عليه السلام.', 'Those are Qābīl and Hābīl, the sons of Adam, peace be upon him.'),
        L(None, 'هل أكملت المذاكرة؟', 'Have you finished your lessons?'),
        L(GHAR, 'لا، كنت أراقب قابيل وهابيل وهما يلعبان.', 'No — I was watching Qābīl and Hābīl at play.'),
        L(None, 'يجب أن تلتفت لدروسك يا أخي حتى تصبح قاضياً للغربان عندما تكبر، كما تتمنى.',
          'You must mind your lessons, brother, if you want to be judge of the crows when you grow up, as you wish.',
          caption('قاضيا غرباني', 'قاضياً للغربان')),
        L(None, 'وأنت يا جعبوب، ماذا تحب أن تكون عندما تكبر؟', 'And you, Jaʿbūb — what would you like to be when you grow up?'),
        L(JAAB, 'بالطبع مطرب الغربان! إن لي صوتاً قوياً وحاداً، سأُسمعك أغنية. صوتي جميل، فاسمع…',
          "The crows' singer, of course! I've a strong, sharp voice — I'll sing you a song. My voice is beautiful — listen…",
          '[يغنّي | sings]'),
        L(None, 'اصمت! كفى إزعاجاً! سأقطع لسانك!', "Quiet! Enough of that racket! I'll cut out your tongue!",
          caption('اصمط', 'اصمت') + ' · أكثر من صوت | several voices'),
    ]),
    dict(title_ar='المشهد الخامس — مزرعتان', title_en='Scene 5 — Two Farms',
         icon='leaf.fill', era='past',
         summary_en='Grown men now: one brother drives the hungry crows off, the other shares his eggs.',
         lines=[
        L(CROW, 'ومرّت السنوات، وكبر قابيل وهابيل ووصلا إلى سنّ الشباب، وكان جدّي غربو وأخوه جعبوب يعيشان وسط الغربان.',
          'The years went by. Qābīl and Hābīl grew into young men, and my grandfather Gharbū and his brother Jaʿbūb lived among the crows.',
          caption('جدي ربوب', 'جدّي غربو')),
        L(JAAB, 'إلى أين نذهب؟', 'Where shall we go?'),
        L(GHAR, 'هذه الأرض مليئة بالثمار والمحاصيل، إنها مزارع قابيل. تفضّل، الطعام شهي!',
          "This land is full of fruit and crops — Qābīl's farms. Go on, the food is delicious!"),
        L(CAIN, 'ابتعد يا لص عن أرضي! ابتعد! صوتك قبيح مثل شكلك يا وجه الشؤم!',
          'Get off my land, thief! Get away! Your voice is as ugly as your face, you bird of ill omen!'),
        L(JAAB, 'كان يجب أن نستأذن.', 'We should have asked first.'),
        L(GHAR, 'حاول أن تبتعد يا أخي عن أرض البشر.', 'Keep away from the land of men, brother.'),
        L(JAAB, 'ولكن هذه زراعات هابيل، وهو لا يؤذي الكائنات الضعيفة.', "But these are Hābīl's fields — and he never harms weak creatures."),
        L(ABEL, 'هل أنت جائع يا صديقي؟ تفضّل، خذ ولا تخف. آه، أنتما اثنان! انتظر، سأحضر بيضة أخرى.',
          "Are you hungry, my friend? Here, take it — don't be afraid. Oh, there are two of you! Wait — I'll fetch another egg.",
          caption('انتم اثنان', 'أنتما اثنان')),
        L(JAAB, 'لماذا بيضة أخرى؟ واحدة تكفينا نحن الاثنين.', 'Why another egg? One is enough for the two of us.'),
        L(GHAR, 'والإخوة دائماً يتشاركون في كل شيء.', 'Brothers always share everything.'),
        L(JAAB, 'قد يكون ذاهباً لإحضار عصاً غليظة، الأفضل أن نطير!', "Maybe he's gone for a thick stick — we'd better fly!"),
        L(GHAR, 'انتظر يا خوّاف! لن يضربك ما دمت لن تغنّي.', "Wait, you coward! He won't beat you — as long as you don't sing."),
        L(ABEL, 'أين ذهب الغرابان؟', 'Where did the two crows go?', caption('الغربان', 'الغرابان')),
    ]),
    dict(title_ar='المشهد السادس — الكوخ', title_en='Scene 6 — The Hut',
         icon='house.fill', era='past',
         summary_en='Qābīl bars his brother from the hut they built, and wounds him.',
         lines=[
        L(CAIN, 'ها، ماذا تريد؟', 'Well? What do you want?'),
        L(ABEL, 'أريد أن أرتاح قليلاً في الكوخ.', 'I want to rest a little in the hut.'),
        L(CAIN, 'ولكن هذا كوخي أنا!', 'But this is my hut!'),
        L(ABEL, 'انظر إلى يديّ، لقد تسلّخت في بناء الكوخ.', 'Look at my hands — they were torn raw building it.', caption('انظر إلى يدي', 'انظر إلى يديّ')),
        L(CAIN, 'لن تبيت في الكوخ بعد غروب الشمس، وهذه كلمتي الأخيرة.', "You won't spend the night in this hut after sunset — and that's my last word."),
        L(ABEL, 'أريد أن أقول كلمة أنا أيضاً: إني أحبك يا قابيل، فلماذا لا تحبني؟', "I have a word to say too: I love you, Qābīl — so why don't you love me?"),
        L(JAAB, 'إلى من يتحدث هذا المسكين؟ لقد انصرف قابيل بعد أن قال كلمته.', "Who is the poor fellow talking to? Qābīl left the moment he'd said his piece."),
        L(ABEL, 'آه… إن دمي يسيل.', "Ah… I'm bleeding."),
        L(CAIN, 'ألم آمرك بعدم النوم هنا؟', "Didn't I order you not to sleep here?"),
        L(ABEL, 'إن جرحي ينزف يا أخي.', 'My wound is bleeding, brother.'),
        L(CAIN, 'ليذكّرك أن تطيع الأوامر. وإياك… إياك أن تدخل الكوخ مرة أخرى!', "Let it remind you to obey orders. And don't you dare — don't you dare set foot in this hut again!"),
        L(JAAB, 'هل تعتقد أنه سيخبر أباه بما حدث؟', 'Do you think he will tell his father what happened?'),
        L(GHAR, 'في ظني لا؛ سيصمت كعادته ويتحمّل الألم وحده.', "I don't think so. He'll keep quiet, as he always does, and bear the pain alone."),
        L(JAAB, 'معك حق. انظر، إنه يحاول إخفاء أثر الجرح. يبني الكوخ ثم ينام في العراء! هذا ليس عدلاً.',
          "You're right. Look — he's trying to hide the wound. He builds the hut, then sleeps out in the open! It isn't fair.",
          caption('يا ابن الكوخ ثم ينام في العرا', 'يبني الكوخ ثم ينام في العراء')),
    ]),
    dict(title_ar='المشهد السابع — الخلاف على الزواج', title_en='Scene 7 — The Quarrel over Marriage',
         icon='person.2.slash.fill', era='past',
         summary_en='Adam has ruled whom each son will marry; Qābīl will not accept it.',
         lines=[
        L(ABEL, 'ولكنه حكم أبي.', "But it is our father's ruling."),
        L(CAIN, 'نحن اللذان سنتزوج، ومن حقنا أن نختار. وأنا اخترت توأمي التي كانت معي في بطن أمي.',
          "We're the ones marrying — we have the right to choose. And I have chosen my twin, who was with me in our mother's womb."),
        L(ABEL, 'لقد قال أبونا آدم إن هذا لا يجوز؛ يجب أن تتزوج أنت من توأمي، وأتزوج أنا من توأمك.',
          'Our father Adam said that is not permitted: you are to marry my twin, and I am to marry yours.'),
        L(CAIN, 'ولماذا تأخذ أنت الأجمل؟', 'And why should you get the prettier one?'),
        L(ABEL, 'الجمال لم يخطر ببالي، لقد أردت فقط تنفيذ أوامر أبي وأمي.', 'Beauty never crossed my mind. I only wanted to do as my father and mother said.'),
        L(CAIN, 'ولماذا تطيعه دون تفكير؟ أين شخصيتك؟', "And why obey him without a thought? Where's your backbone?"),
        L(ABEL, 'موجودة، ولكني لن أصل أبداً إلى حكمة أبي وعلمه. إنه نبيّ الله، علّمه الله تعالى الأسماء كلها — كل أسماء الكائنات — حتى إن الملائكة الكرام لم يعرفوا الأسماء، وعرفها أبي.',
          'Right here. But I will never reach my father\'s wisdom and knowledge. He is God\'s prophet: God taught him all the names — the name of every creature — names even the noble angels did not know, and my father did.'),
        L(CAIN, 'اختصارُ الكلام: أنا أريد الزواج من توأمي، وسأفعل ما أريده.', "To cut it short: I want to marry my twin, and I'll do as I please."),
        L(ABEL, 'لا يا أخي، اعرض رغبتك على أبينا، وأنا سأرضى بحكمه. تفضّل.', "No, brother — put your wish to our father, and I'll accept whatever he decides. Here, have some.",
          caption('وانا سارى بحكمه', 'وأنا سأرضى بحكمه') + ' · يقدّم له حليباً | he offers him milk'),
        L(CAIN, 'لم آتِ إلى هنا لأشرب الحليب، ولن تخدعني يا هابيل بطيبتك المزيّفة، أتفهم؟',
          "I didn't come here to drink milk — and you won't fool me with your fake goodness, Hābīl. Understand?"),
    ]),
    dict(title_ar='المشهد الثامن — القربان', title_en='Scene 8 — The Offering',
         icon='flame.fill', era='past',
         summary_en='Each brother brings an offering to God. Fire takes one — and Qābīl swears to kill.',
         lines=[
        L(JAAB, 'أخبرني، ماذا حدث بين قابيل وهابيل؟', 'Tell me — what happened between Qābīl and Hābīl?'),
        L(GHAR, 'ذهبا إلى آدم عليه السلام وعرضا عليه الأمر.', 'They went to Adam, peace be upon him, and put the matter before him.', caption('ذهب … وعرض', 'ذهبا … وعرضا')),
        L(JAAB, 'وبماذا حكم؟', 'And what did he rule?'),
        L(GHAR, 'قال إن الحكم لله وحده، وطلب منهما أن يقدّما قربانين إلى الله، ومن يُقبل قربانه يكن هو الفائز.',
          'He said judgement belongs to God alone, and asked each of them to bring God an offering: whoever\'s offering is accepted, wins.',
          caption('قرباني', 'قربانين')),
        L(JAAB, 'غربو، هناك شيء لا أفهمه: ما معنى كلمة «قربان»؟', "Gharbū, there's something I don't understand. What does 'offering' mean?"),
        L(GHAR, 'القربان هديّة تُقدَّم إلى الله تعالى بنيّة التقرّب إليه وطلب رضوانه.', "An offering is a gift given to God Almighty, meant to draw near to Him and seek His good pleasure."),
        L(JAAB, 'أتمنى أن يفوز هابيل الطيب ويتزوج الأخت الأجمل والأكثر رقّة.', 'I hope good Hābīl wins, and marries the lovelier, gentler sister.'),
        L(GHAR, 'وأنا أيضاً أتمنى الفوز لهابيل الطيب.', 'So do I — I hope good Hābīl wins.',
          caption('الفوج', 'الفوز')),
        L(CAIN, 'هل أقدّم خروفاً أو نعجة؟ لا، لا، لا! طبعاً لا؛ أنا أحب اللحم ولا يمكن أن أقدّمه كقربان. آه، ما العمل؟',
          "Should I offer a ram, or a ewe? No, no, no — of course not! I love meat; I can't give it away as an offering. Ah, what to do?"),
        L(CAIN, 'لا بأس بدجاجة نحيفة… للأسف، كل الدجاج ثمين ولذيذ. إذاً ثمرة فاكهة غير ناضجة… غداً ستنضج وتصبح لذيذة.',
          "A scrawny chicken would do… no — every chicken is precious and tasty. An unripe fruit, then… no — tomorrow it'll ripen and be delicious.",),
        L(CAIN, 'آه، هذه الحبوب كثيرة وتفيض دائماً عن حاجتي، كما أنها ستفسد على كل الأحوال. إنها القربان المناسب.',
          "Ah — this grain: there's plenty, always more than I need, and it'll rot anyway. That's the right offering."),
        L(ABEL, 'هذا الكبش أسمن ما عندي. أبشر يا صديقي، ستكون قرباناً لله تبارك وتعالى. والله كنت أحب أن أقدّم نفسي بدلاً منك.',
          "This ram is the finest I have. Rejoice, my friend — you'll be an offering to God, blessed and exalted. By God, I would rather have offered myself in your place."),
        L(JAAB, 'والآن، ما الذي يُفترض أن يحدث؟', 'And now — what is supposed to happen?'),
        L(GHAR, 'لا أدري، ربما يبعث الله لنا بإشارة واضحة لقبول أحد القربانين.', "I don't know. Perhaps God will send us a clear sign of which offering He accepts.",
          '[تنزل نارٌ من السماء فتأكل قربان هابيل | fire comes down from the sky and consumes Hābīl\'s offering]'),
        L(ABEL, 'الحمد لله، الحمد لله رب العالمين!', 'Praise be to God — praise be to God, Lord of the worlds!'),
        L(CAIN, 'القتل! القتل! سأقتلك ذات يوم!', "Murder! Murder! One day I'll kill you!"),
        L(NARR, 'وَاتْلُ عَلَيْهِمْ نَبَأَ ابْنَيْ آدَمَ بِالْحَقِّ إِذْ قَرَّبَا قُرْبَانًا فَتُقُبِّلَ مِنْ أَحَدِهِمَا وَلَمْ يُتَقَبَّلْ مِنَ الْآخَرِ قَالَ لَأَقْتُلَنَّكَ ۖ قَالَ إِنَّمَا يَتَقَبَّلُ اللَّهُ مِنَ الْمُتَّقِينَ',
          "And recite to them, in truth, the story of Adam's two sons: when each brought an offering, and it was accepted from one and not from the other. He said, 'I will surely kill you.' The other said, 'God accepts only from those who are mindful of Him.'",
          "آية قرآنية — سورة المائدة ٥:٢٧ | Qur'an 5:27"),
        L(NARR, 'صدق الله العظيم.', 'God Almighty has spoken the truth.'),
    ]),
    dict(title_ar='المشهد التاسع — الخير والشر', title_en='Scene 9 — Good and Evil',
         icon='moon.stars.fill', era='present',
         summary_en='Back under the tree: evil is not the whole of mankind — and the story is not over.',
         lines=[
        L(CROW, 'هل أدركت الآن لماذا أنتقد الإنسان وأكره تصرفاته؟', 'Do you see now why I find fault with man, and hate what he does?', caption('واكره تصرفات', 'وأكره تصرفاته')),
        L(SHEP, 'لك الحق في أن تغضب من قابيل وتبغضه، ولكن ليس كل الناس مثل قابيل. لا تنسَ أن شقيقه الطيب هابيل هو أيضاً إنسان.',
          "You have every right to be angry with Qābīl and to loathe him — but not all people are like Qābīl. Don't forget that his good brother Hābīl was a human being too."),
        L(SHEP, 'إن الخير والشر يا صديقي موجودان في الدنيا ومتلازمان… ولكنّه هو الخاسر؛ يخسر الدنيا والآخرة.',
          'Good and evil, my friend, both exist in this world, bound together… but it is evil that loses — it loses this world and the next.',
          caption('ومتلازمة', 'ومتلازمان') + ' · ' + GAP),
        L(CROW, 'أنت لا تعرف بقية القصة؛ على الأقل لم تعرفها من وجهة نظر الغربان.', "You don't know the rest of the story — not from the crows' side, at least."),
        L(SHEP, 'تفضّل، كلّي آذانٌ مصغية.', "Go on — I'm all ears."),
        L(CROW, 'لا، لا، لقد تأخر الوقت كثيراً. يجب أن أدخل عشّي وأقول تسبيحي لله قبل النوم.', "No, no — it's very late. I must get into my nest and say my glorification of God before I sleep.",
          'الأصل في التفريغ: «واؤل» — نطقٌ مصري لـ«وأقول» | Egyptian «أؤول» for «أقول»'),
        L(SHEP, 'حسناً، حسناً. نلتقي في الغد إن شاء الله؟', 'All right, all right. Shall we meet tomorrow, God willing?'),
        L(CROW, 'لا مانع. غداً أنتظرك هنا عند نفس هذه الشجرة.', "Why not? Tomorrow I'll wait for you here, by this same tree."),
        L(SHEP, 'ألقاك على خير بإذن الله.', 'Until then — God willing, in good health.'),
        L(SHEP, 'سبحان مَن هذا خلقُه!', 'Glory to Him whose creation this is!'),
    ]),
]

for i, s in enumerate(SCENES, 1):
    s['scene_no'] = i

NOTES = (
    "Reconstructed from the raw auto-generated YouTube captions (ar_text_unit.text_ar) alone, by reading the "
    "Arabic: its grammar, the sense of the scene, and — for the āyah — the muṣḥaf. The archive's machine English "
    "was not used, for the Arabic or for the translation. Punctuation, hamzas and word boundaries are restored; "
    "each caption word that had to be repaired is flagged in the line's note with what the captions heard, and "
    "where the captions skip, the gap is marked rather than filled. Speakers are named where the dialogue makes "
    "them plain and left unnamed where it does not. The English is a fresh translation of the reconstructed "
    "Arabic, written as script.")

DOC = dict(
    title_ar='غراب ابني آدم - ج 1',
    title_en="The Raven of Adam's Sons — Episode 1 (Part 1)",
    series_ar='قصص الحيوان في القرآن', series_en="Animal Stories from the Qur'an", episode=1,
    video_url='https://www.youtube.com/watch?v=eHobRabok1s',
    acq_ref_id='ACQ:YT:eHobRabok1s', source_text_unit_id=UNIT,
    reconstruction_notes=NOTES,
    cast=CAST,
    scenes=[{k: s[k] for k in ('scene_no', 'title_ar', 'title_en', 'icon', 'era', 'summary_en', 'lines')} for s in SCENES],
)

if __name__ == '__main__':
    j = json.dumps(DOC, ensure_ascii=False, separators=(',', ':')).replace("'", "''")
    print(f"UPDATE ar_text_unit SET script_json = '{j}' WHERE id = '{UNIT}';")
