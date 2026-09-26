# -*- coding: utf-8 -*-
"""The script of «ذئب يوسف — ج 1» (Animal Stories from the Qur'an, ep. 7),
reconstructed from the raw YouTube auto-captions in ar_text_unit.text_ar by
reading the Arabic alone — its grammar, the scene, and the Qur'an it echoes.
The archive's machine English is not used; the English here is translated
fresh from the reconstructed Arabic.

    python3 scripts/episodes/apply.py dhib_ep1
"""
import json

UNIT = 'ARTX:YT-4I3XHnmiiR8:1'

SHEP, QANNAS, MIQDAM = 'الراعي', 'قنّاص', 'مقدام'
FATHER, MOTHER, JASURA, LEADER, NARR = 'أبو قنّاص', 'أمّ قنّاص', 'جسورة', 'قائد الذئاب', 'راوٍ'

CAST = [
    dict(name_ar=SHEP, name_en='The Shepherd', role_en='counts his flock — and tells it the story', icon='figure.stand'),
    dict(name_ar=QANNAS, name_en='Qannāṣ', role_en='a wolf whose name means "hunter"', icon='pawprint.fill'),
    dict(name_ar=MIQDAM, name_en='Miqdām', role_en='his younger brother — "the bold", who is afraid', icon='pawprint'),
    dict(name_ar=FATHER, name_en="Qannāṣ's father", role_en='"a brother cannot be replaced"', icon='shield.fill'),
    dict(name_ar=MOTHER, name_en="Qannāṣ's mother", role_en='fears losing both sons', icon='heart.circle.fill'),
    dict(name_ar=JASURA, name_en='Jasūra', role_en='a she-wolf — "the daring"', icon='heart.fill'),
    dict(name_ar=LEADER, name_en='The Pack Leader', role_en='grown old; looking for who comes after', icon='crown.fill'),
    dict(name_ar=NARR, name_en='Narrator', role_en='recites the āyah', icon='book.closed.fill'),
]


def L(speaker, ar, en, note=None):
    d = dict(speaker=speaker, ar=ar, en=en)
    if note: d['note'] = note
    return d


def caption(heard, read):
    return f'الأصل في التفريغ: «{heard}» — رُجّحت «{read}» اعتماداً على السياق والنحو'


def yusuf(n, ar_n, text):
    return f'صدى لقوله تعالى: ﴿{text}﴾ يوسف ١٢:{ar_n} | echoes Qur\'an 12:{n}'


UNNAMED = 'المتكلم لا يُسمّى | the speaker is unnamed'
BROTHER = 'من إخوة يوسف | one of Joseph\'s brothers'
PACK = 'ذئب من القطيع | a wolf of the pack'

SCENES = [
    dict(title_ar='المشهد الأول — الخروف الناقص', title_en='Scene 1 — The Missing Sheep',
         icon='list.number', era='present',
         summary_en="A shepherd counts his flock, finds one missing, blames the wolf — and catches himself.",
         lines=[
        L(SHEP, 'واحد، اثنان… لا! أربعة… هناك خروف ناقص بالتأكيد! تُرى أين ذهب؟ هل أكله الذئب وأنا غافل عنه؟',
          "One, two… no! Four… there's definitely a sheep missing! Where can it have gone? Did the wolf eat it while I wasn't watching?",
          caption('واحد اان لا 4 خ', 'واحد، اثنان… لا! أربعة…')),
        L(SHEP, 'سيدفع الثمن غالياً! سأجعله عبرة لكل من يعتدي على غنمي.', "He'll pay dearly for it! I'll make an example of him to anyone who touches my sheep."),
        L(SHEP, 'أنت هنا! قلت لك ألّا تشرد عن القطيع؛ هناك ذئاب جائعة تنتظر دائماً من يخرج عن جماعته ويسير وحده، لتنقضّ عليه.',
          "There you are! I told you not to stray from the flock. There are hungry wolves always waiting for one who leaves the group and walks alone — to pounce on him.",
          caption('القطيعه', 'القطيع')),
        L(SHEP, 'ولكني ظلمت الذئب، أستغفر الله العظيم! فعلت مثلما فعل إخوة يوسف عليه السلام.', "But I've wronged the wolf — may God forgive me! I did just what Joseph's brothers did, peace be upon him.",
          caption('اخوه يوسف', 'إخوة يوسف')),
        L(SHEP, 'تريد أن تعرف قصة ذئب يوسف؟ انضمّ أولاً إلى باقي القطيع، وسأحكيها لكم جميعاً.', "You want to hear the story of Joseph's wolf? First get back with the rest of the flock — and I'll tell it to you all.",
          caption('وساح كيها', 'وسأحكيها')),
    ]),
    dict(title_ar='المشهد الثاني — يوم الذئب', title_en="Scene 2 — The Wolf's Day",
         icon='moon.fill', era='present',
         summary_en='When the flock is asleep, the wolf\'s day begins — and he is not what people say.',
         lines=[
        L(SHEP, 'بعد أن تسيروا وتتناولوا العشب طوال النهار، ويحلّ بكم التعب عند الليل، يبدأ يوم الذئب.', "After you've walked and grazed all day, and night brings your tiredness on — that's when the wolf's day begins.",
          caption('وتتناول', 'وتتناولوا')),
        L(SHEP, 'الذئب كائن ليليّ يعيش على الصيد والافتراس، لكنه بالرغم من ذلك يتحلّى ببعض الصفات الطيبة؛ فهو لا يأكل إلا مرة واحدة كل أسبوع.',
          "The wolf is a creature of the night that lives by hunting and killing. And yet it has some good qualities: it eats only once a week."),
        L(SHEP, 'نقول نحن البشر عن الرجل الذي يتودّد للنساء إنه «ذئب»، وهذه في الحقيقة إهانة للذئاب؛ فالذئب لا يهتم بالتزاوج وبقاء النوع إلا شهراً واحداً في السنة.',
          "We humans call a man who chases women 'a wolf' — which is really an insult to wolves. The wolf gives its mind to mating and keeping its kind alive for just one month of the year."),
        L(SHEP, 'كما أن الذئب شديد التعلّق بأسرته ومجتمعه من الذئاب، وهم لا يخرجون للصيد وتناول الطعام إلا في جماعات كبيرة منظّمة.',
          "And the wolf is deeply attached to its family and its community of wolves. They never go out to hunt or eat except in large, orderly packs."),
    ]),
    dict(title_ar='المشهد الثالث — الأخوان', title_en='Scene 3 — Two Brothers',
         icon='person.2.fill', era='past',
         summary_en="Their father's one instruction: look after your brother. Miqdām is too frightened to hunt.",
         lines=[
        L(FATHER, 'قنّاص، احرص على سلامة أخيك مقدام. الأخ لا يُعوَّض يا بنيّ.', "Qannāṣ, keep your brother Miqdām safe. A brother cannot be replaced, my son."),
        L(QANNAS, 'اطمئنّ يا أبي.', "Don't worry, father."),
        L(FATHER, 'سأنضمّ الآن إلى الكبار لنضع خطة الصيد. كونا جاهزين في منتصف الليل تماماً.', "I'm going to join the elders now to plan the hunt. Be ready at midnight exactly.",
          caption('سانم', 'سأنضمّ')),
        L(QANNAS, 'أمرك يا أبي.', 'As you say, father.'),
        L(QANNAS, 'أخي، أخي، ماذا بك؟', "Brother — brother, what's wrong?"),
        L(MIQDAM, 'إني… إني خا… خائف.', "I'm… I'm s… scared."),
        L(QANNAS, 'ما معنى كلمة «خائف»؟ هل أنت كلب لتخاف؟', "What does 'scared' mean? Are you a dog, to be scared?"),
        L(MIQDAM, 'كلب؟ إن أسناني تصطكّ من الخوف! هل أضعها على رقبتك لأريك كم أنا خائف؟', "A dog? My teeth are chattering with fear! Shall I put them to your neck to show you how scared I am?",
          caption('تستق', 'تصطكّ')),
    ]),
    dict(title_ar='المشهد الرابع — الصيد', title_en='Scene 4 — The Hunt',
         icon='exclamationmark.triangle.fill', era='past',
         summary_en="The hunt goes wrong. Qannāṣ goes out to look — and comes back to an empty hiding place.",
         lines=[
        L(None, 'الذئاب!', 'The wolves!', caption('الثياب', 'الذئاب') + ' · ' + UNNAMED),
        L(None, 'تراجعوا، تراجعوا! سندور حولهم.', "Fall back, fall back! We'll circle round them.", PACK),
        L(QANNAS, 'انهض، هيا!', 'Get up — come on!'),
        L(MIQDAM, 'آه، قدمي تؤلمني بشدّة.', 'Ah — my foot hurts so much.'),
        L(QANNAS, 'انسَ الألم الآن. أنت مصاب في وجهك!', "Forget the pain for now. You're hurt — your face!"),
        L(MIQDAM, 'جرح بسيط.', "It's just a scratch."),
        L(QANNAS, 'اصمت! لقد هدأت الأصوات. سأخرج لاستطلاع الأمر.', "Quiet! The noise has died down. I'll go out and see what's happening.", caption('الاص وا', 'الأصوات')),
        L(MIQDAM, 'ليس الآن!', 'Not now!'),
        L(QANNAS, 'لا تخف عليّ. هل أنت كلب لتخاف؟', "Don't worry about me. Are you a dog, to be scared?"),
        L(QANNAS, 'مقدام! مقدام! أين أنت؟ أخي!', 'Miqdām! Miqdām! Where are you? Brother!'),
    ]),
    dict(title_ar='المشهد الخامس — البحث', title_en='Scene 5 — The Search',
         icon='magnifyingglass', era='past',
         summary_en='The whole pack searched Sinai. Qannāṣ will not come back without his brother.',
         lines=[
        L(QANNAS, 'أبي، إني ذاهب يا أبي… أمّي… يا أبي.', "Father — I'm going, father… mother… father.", '[يودّع | saying goodbye]'),
        L(FATHER, 'لقد بحثنا عن أخيك في كل صحراء سيناء؛ لم نترك فجوة في جبل، ولم نترك كهفاً إلا وبحثنا فيه، ولكننا لم نجده.',
          "We've searched for your brother through the whole desert of Sinai — not a crack in a mountain, not a cave we didn't search. But we didn't find him."),
        L(QANNAS, 'فهل نتركه يضيع؟', 'So do we just leave him lost?'),
        L(MOTHER, 'يا بنيّ، أنا أكثر منك حزناً على فراق وليدي، ولكنكم بحثتم، أنت وأبوك وباقي الذئاب، فكيف تجده وحدك؟',
          "My son, I grieve for my lost child more than you do. But you searched — you, your father and all the other wolves. How will you find him alone?",
          caption('تجدوه', 'تجده')),
        L(QANNAS, 'لن أعود إلا وأخي في يدي. هذا قراري الأخير.', "I won't come back without my brother. That's my final decision."),
        L(MOTHER, 'أخشى أن تضيعا معاً.', "I'm afraid you'll both be lost.", caption('تضيع معا', 'تضيعا معاً')),
        L(QANNAS, 'يا أمّي، إن حياتي بدون أخي لا معنى لها.', 'Mother, my life has no meaning without my brother.'),
        L(MOTHER, 'كن على حذر يا بنيّ.', 'Be careful, my son.'),
        L(SHEP, 'ومضى الذئب يبحث عن شقيقه في كل الصحراء، وفي كل كهوف الجبال؛ كان يقطع في الليلة الواحدة خمسين ميلاً.',
          "And the wolf went off to search for his brother through all the desert and every mountain cave. In a single night he would cover fifty miles."),
        L(SHEP, 'ومرّت الأيام والشهور، ووصل إلى أرض تملأ سماءها الحمائم، وتحوطها أشجار الزيتون، وكان يعيش فيها نبيّ كريم، هو سيدنا يعقوب عليه الصلاة والسلام.',
          "Days and months went by, and he came to a land whose sky was full of doves, ringed with olive trees — where a noble prophet lived: our master Jacob, peace be upon him.",
          caption('وتحوط اشجار', 'وتحوطها أشجار')),
    ]),
    dict(title_ar='المشهد السادس — جسورة', title_en='Scene 6 — Jasūra',
         icon='heart.fill', era='past',
         summary_en="He asks every wolf about a short-haired brother with a limp. She answers a question he didn't ask.",
         lines=[
        L(QANNAS, 'السلام عليكم.', 'Peace be upon you.'),
        L(None, 'ماذا تريد أيها الغريب؟', 'What do you want, stranger?', UNNAMED),
        L(QANNAS, 'جئت أبحث عن أخي. إنه مثلي، قصير الشعر، ويعرج قليلاً.', "I've come looking for my brother. He's like me — short-haired — and he limps a little."),
        L(None, 'لم نرَه.', "We haven't seen him."),
        L(QANNAS, 'تفضّلي، هو لكِ.', "Here — it's yours.", '[يقدّم لها صيده | offering her his catch]'),
        L(JASURA, 'ولكنك أنت الذي صِدته.', 'But you caught it.', caption('طط', 'صِدته')),
        L(QANNAS, 'لست جائعاً، تفضّلي.', "I'm not hungry. Please."),
        L(JASURA, 'هذا كرم شديد.', "That's very generous."),
        L(QANNAS, 'هل لي أن أسألك سؤالاً؟', 'May I ask you a question?', caption('سؤاله', 'سؤالاً')),
        L(JASURA, 'بالطبع… لست متزوّجة!', "Of course… I'm not married!"),
        L(QANNAS, 'لم يكن هذا سؤالي في الحقيقة. إني أبحث عن شقيقي، هو قصير الشعر مثلي…', "That wasn't actually my question. I'm looking for my brother — he's short-haired, like me…"),
        L(JASURA, 'ومثلي أنا أيضاً.', 'And like me, too.'),
        L(QANNAS, 'وهو يعرج قليلاً.', 'And he limps a little.'),
        L(JASURA, 'ألا تفكّر إلا في أخيك؟', "Don't you think about anything but your brother?"),
        L(QANNAS, 'لقد غادرت أرضي وتغرّبت بحثاً عنه.', "I left my land and went into exile to look for him.", caption('عنها', 'عنه')),
        L(JASURA, 'يا لك من ذئبٍ رقيق!', 'What a tender-hearted wolf you are!'),
        L(QANNAS, 'هذه إهانة!', "That's an insult!"),
        L(JASURA, 'إني لم أقصدها، صدّقني.', "I didn't mean it that way — believe me.", caption('ان لم', 'إني لم')),
        L(QANNAS, 'ما اسمك؟', "What's your name?"),
        L(JASURA, 'جسورة. اسم غريب، أليس كذلك؟ ربما يكون اسمي الغريب هو السبب في تأخّر زواجي، أو ربما يكون السبب هو شعري القصير؛ فالذئاب في هذه المنطقة لا يقدّرون الجمال الحقيقي.',
          "Jasūra. An odd name, isn't it? Maybe my odd name is why I haven't married yet — or maybe it's my short hair. The wolves round here don't appreciate real beauty."),
    ]),
    dict(title_ar='المشهد السابع — الكهف', title_en='Scene 7 — The Cave',
         icon='mountain.2.fill', era='past',
         summary_en="A cave full of spiders, a wolf who needs a wife — and the strangest proposal she ever heard.",
         lines=[
        L(QANNAS, 'معذرة، يجب أن أبحث عن مكان لأبيت فيه.', 'Excuse me — I have to find somewhere to spend the night.'),
        L(JASURA, 'أعرف كهفاً في أعلى الجبل لا يقيم فيه أحد. هل أدلّك عليه؟', "I know a cave high up the mountain where nobody lives. Shall I show you?",
          caption('لا يق فيه', 'لا يقيم فيه')),
        L(QANNAS, 'أكون شاكراً.', "I'd be grateful."),
        L(QANNAS, 'المكان جيد، أشكرك.', "It's a good place. Thank you."),
        L(JASURA, 'ولكنه يحتاج إلى ترتيب؛ فهو كهف مهجور ومليء بالعناكب.', "But it needs tidying — it's an abandoned cave, full of spiders."),
        L(QANNAS, 'لا بأس، سيفي بالغرض.', "Never mind — it'll do."),
        L(JASURA, 'أعتقد أنك بحاجة إلى من ينظّف لك المكان، ويساعدك في نقل الماء والطعام.', "I think you need someone to clean the place for you, and help you carry water and food."),
        L(QANNAS, 'هذا صحيح. عندما أجد أخي سيعينني في هذه الأمور.', "That's true. When I find my brother, he'll help me with all that.", caption('سيعين مني', 'سيعينني')),
        L(JASURA, 'الذكور لا يعرفون شيئاً عن النظافة أو الترتيب. أنت بحاجة إلى زوجة.', "Males know nothing about cleaning or tidying. You need a wife."),
        L(QANNAS, 'همم، معك حق، كلامك صحيح، أنا بحاجة لزوجة. ولكن أين… أين أجدها؟', "Hmm — you're right, that's true. I need a wife. But where… where would I find one?"),
        L(JASURA, 'ابحث حولك.', 'Look around you.'),
        L(QANNAS, 'أنا غريب في هذه المنطقة. لعلّكِ تقبلين مساعدتي في حلّ المشكلة؟', "I'm a stranger in these parts. Perhaps you'd be willing to help me solve the problem?"),
        L(JASURA, 'ماذا تقصد؟', 'What do you mean?'),
        L(QANNAS, 'دلّيني على ذئبة من صاحباتك تكون مناسبة لي.', 'Point me to a she-wolf among your friends who would suit me.'),
        L(JASURA, 'أنت أغرب ذئب رأيته في حياتي!', "You're the strangest wolf I've ever seen in my life!"),
        L(QANNAS, 'جسورة، انتظري!', 'Jasūra — wait!'),
        L(JASURA, 'ماذا تريد؟', 'What do you want?'),
        L(QANNAS, 'هل أتجاوز حدودي إذا قلت… أقصد: فكّرت في الزواج بكِ أنتِ؟', "Would I be overstepping if I said… I mean — I've thought of marrying you?"),
        L(JASURA, 'فاجأتني!', "You've taken me by surprise!"),
        L(QANNAS, 'يبدو أنني تسرّعت. أرجوكِ أن تنسي كل ما قلته.', "It seems I've been hasty. Please forget everything I said."),
        L(JASURA, 'انتظر! لقد قبلت زواجك. سأكون زوجتك، وسأكون أخاك الأصغر، فلا تحزن.', "Wait! I accept. I'll be your wife — and I'll be your little brother too, so don't be sad."),
    ]),
    dict(title_ar='المشهد الثامن — الصغار', title_en='Scene 8 — The Cubs',
         icon='house.fill', era='past',
         summary_en='Their youngest looks just like Miqdām. The cubs need meat now — and there is a sheep on the wind.',
         lines=[
        L(JASURA, 'قنّاص يا حبيبي، يجب أن تذهب إلى الصيد.', 'Qannāṣ, my love, you must go hunting.'),
        L(QANNAS, 'دعيني أتأمّل أولادي. انظري إلى أصغرهم، إنه يشبه أخي مقدام إلى حدّ كبير.', "Let me look at my children. Look at the youngest — he's so like my brother Miqdām."),
        L(JASURA, 'لقد كبر الصغار يا حبيبي، ولم يعد اللبن يكفيهم؛ يجب أن أمضغ اللحم في فمي ثم أطعمهم به.', "The little ones have grown, my love — milk isn't enough for them any more. I have to chew meat in my mouth and feed it to them."),
        L(QANNAS, 'جسورة، هل تشمّين ما أشمّ؟', 'Jasūra — do you smell what I smell?', caption('جزوره', 'جسورة')),
        L(JASURA, 'نعم، إنها… إنها رائحة خروف!', "Yes — it's… it's the smell of a sheep!"),
        L(QANNAS, 'الخراف غبيّة، لا تستحمّ جيداً، ولهذا تدلّ رائحتها عليها. استعدّوا لعشاء شهيّ!', "Sheep are stupid — they don't wash properly, so their smell gives them away. Get ready for a delicious supper!"),
        L(JASURA, 'الحمد لله! افرحوا يا صغار، سنأكل خروفاً!', "Praise be to God! Be happy, little ones — we're going to eat a sheep!", caption('خرافا', 'خروفاً')),
        L(QANNAS, 'لماذا ابتعدتَ أيها الخروف الغبي؟', 'Why have you wandered off, you stupid sheep?', caption('ابتع', 'ابتعدتَ')),
    ]),
    dict(title_ar='المشهد التاسع — مؤامرة الإخوة', title_en="Scene 9 — The Brothers' Plot",
         icon='eye.fill', era='past',
         summary_en="Stalking the sheep, the wolf overhears ten brothers plan to be rid of Joseph — and blame the wolf.",
         lines=[
        L(None, 'إن أبانا يحبّ يوسف أكثر مما يحبّنا جميعاً.', 'Our father loves Joseph more than he loves all of us.', BROTHER),
        L(None, 'نعم، إنه يحبّ يوسف وشقيقه الأصغر ولا يهتمّ بنا، ونحن عصبة قويّة. إن أبانا لفي ضلال مبين.',
          "Yes — he loves Joseph and his younger brother, and pays no attention to us, though we are a strong band. Our father is plainly in error.",
          BROTHER + ' — ' + yusuf(8, '٨', 'إِذْ قَالُوا لَيُوسُفُ وَأَخُوهُ أَحَبُّ إِلَىٰ أَبِينَا مِنَّا وَنَحْنُ عُصْبَةٌ إِنَّ أَبَانَا لَفِي ضَلَالٍ مُّبِينٍ')),
        L(None, 'والعمل؟ كيف نحلّ هذه المشكلة؟', "So what do we do? How do we solve this problem?", BROTHER),
        L(None, 'نقتل يوسف، أو نطرحه أرضاً بين الحياة والموت.', 'We kill Joseph — or throw him out somewhere, between life and death.',
          BROTHER + ' — ' + yusuf(9, '٩', 'اقْتُلُوا يُوسُفَ أَوِ اطْرَحُوهُ أَرْضًا')),
        L(None, 'فكرة غبيّة! سيعرف أبانا أننا وراء قتله، وسيتحوّل إهماله لنا إلى غضب وعقاب شديد. أرى أن نلقي به في بئر مهجورة، كأنه سقط بالمصادفة.',
          "A stupid idea! Our father would know we were behind his death, and his neglect of us would turn into fury and harsh punishment. I say we throw him into a disused well — as if he fell in by accident.",
          caption('وس حول', 'وسيتحوّل') + ' · ' + BROTHER + ' — ' + yusuf(10, '١٠', 'وَأَلْقُوهُ فِي غَيَابَتِ الْجُبِّ')),
        L(None, 'وكيف نبرّر لأبينا اختفاء يوسف؟', "And how do we explain Joseph's disappearance to our father?", BROTHER),
        L(None, 'نقول إنه تاه منّا.', 'We say we lost him.', BROTHER),
        L(None, 'لا، هذه حيلة مكشوفة. نقول: أكله الذئب ونحن عنه غافلون.', "No, that trick's too obvious. We say: the wolf ate him while we weren't watching.",
          BROTHER + ' — ' + yusuf(13, '١٣', 'وَأَخَافُ أَن يَأْكُلَهُ الذِّئْبُ وَأَنتُمْ عَنْهُ غَافِلُونَ')),
        L(None, 'همم، فكرة رائعة! نقول إننا كنا نستبق وتركنا يوسف الصغير عند متاعنا، فجاء الذئب الشرير وأكله.',
          "Hmm — a brilliant idea! We'll say we were racing each other and left little Joseph with our things, and the wicked wolf came and ate him.", BROTHER),
        L(QANNAS, 'الذئب الشرير؟ إنني لأتقزّز من سماع حواركم! تتآمرون لقتل أخيكم، ثم تتّهمون الذئاب بالشرّ والخيانة؟ كيف تحمل قلوبكم كل هذا الحقد؟',
          "The wicked wolf? Listening to you makes me sick! You plot to kill your own brother, and then accuse wolves of wickedness and treachery? How can your hearts hold so much hatred?",
          caption('انني لا اتقزز … تتامر', 'إنني لأتقزّز … تتآمرون')),
        L(QANNAS, 'لقد شاهدت الشيطان يجلس بينكم وأنتم لا ترونه. كرهت رائحة الخروف الصغير، وكرهت أن آكل من القطيع.',
          "I saw Satan sitting among you, and you couldn't see him. I can't stand the smell of that little sheep now — I can't bear to eat from their flock."),
    ]),
    dict(title_ar='المشهد العاشر — لا نملك ألسنتهم', title_en="Scene 10 — We Don't Have Their Tongues",
         icon='hand.raised.slash.fill', era='past',
         summary_en="He came home with nothing. Men blame wolves for their own treachery, and wolves cannot answer.",
         lines=[
        L(QANNAS, 'كانت رحلة سوداء، ليتني لم أخرج!', "It was a black day out there — I wish I'd never gone!"),
        L(JASURA, 'لماذا؟', 'Why?'),
        L(QANNAS, 'ذهبت أبحث عن صيد، فوجدتهم يبحثون عنّي.', 'I went looking for prey — and found them looking for me.'),
        L(JASURA, 'عنك أنت؟', 'For you?'),
        L(QANNAS, 'نعم.', 'Yes.'),
        L(JASURA, 'لماذا يبحثون عنك؟', 'Why are they looking for you?'),
        L(QANNAS, 'لأنني أكلت يوسف!', 'Because I ate Joseph!'),
        L(JASURA, 'من يكون يوسف؟', 'Who is Joseph?'),
        L(QANNAS, 'إنسان لم أره قطّ. يريد إخوته إلقاءه في البئر، واتّهامي بأنني أكلته.', "A human being I've never even seen. His brothers want to throw him down a well and accuse me of eating him.",
          caption('واتهام بانني', 'واتّهامي بأنني')),
        L(JASURA, 'أنت لا تأكل لحم الآدميين، فكيف يتّهمونك؟', "You don't eat human flesh — how can they accuse you?", caption('اللحم الاد', 'لحم الآدميين')),
        L(QANNAS, 'المصيبة أن يوسف أخوهم!', 'The terrible thing is — Joseph is their brother!'),
        L(JASURA, 'وما ذنب أولادك فيما حدث؟ لماذا لم تُحضر لنا العشاء؟', "And what have your children done to deserve this? Why didn't you bring us supper?"),
        L(QANNAS, 'قلت لكِ: عافت نفسي هذا الخروف بالتحديد. إنهم يريدون قتل أخيهم، في الوقت الذي هاجرت أنا فيه من أرضي بحثاً عن أخي المفقود!',
          "I told you — I couldn't stomach that sheep in particular. They want to kill their brother, while I left my own land to search for my lost one!",
          caption('صدت نفسي عن', 'عافت نفسي')),
        L(JASURA, 'هوّن على نفسك يا حبيبي.', 'Go easy on yourself, my love.'),
        L(QANNAS, 'ويتّهمون الذئاب بالغدر والخيانة والشرّ! أيّ ظلم هذا! ونحن لا نملك ألسنتهم ولا عقولهم لنردّ الظلم الواقع علينا.',
          "And they accuse wolves of betrayal, treachery and evil! What injustice! And we don't have their tongues or their minds, to answer the wrong done to us.",
          caption('ظم', 'ظلم')),
        L(QANNAS, 'الحمد لله الذي خلقنا ذئاباً لا تخفي ما بداخلها.', "Praise be to God, who made us wolves — who hide nothing of what is inside us."),
    ]),
    dict(title_ar='المشهد الحادي عشر — القائد الجديد', title_en='Scene 11 — The New Leader',
         icon='crown.fill', era='past',
         summary_en="Qannāṣ picks the hardest target — ten armed men in the north — and is made leader of the pack.",
         lines=[
        L(LEADER, 'لماذا تأخّرت عن الاجتماع يا قنّاص؟', 'Why are you late for the meeting, Qannāṣ?'),
        L(QANNAS, 'لا شيء. عفواً، لم أنتبه للموعد.', "It's nothing. Sorry — I lost track of the time.", caption('للعوا', 'للموعد')),
        L(LEADER, 'فلنبدأ إذاً. من لديه هدف يقترحه علينا؟', 'Then let us begin. Who has a target to propose?'),
        L(None, 'عثرت بالأمس على مستعمرة للفئران السمينة.', 'Yesterday I found a colony of fat rats.', PACK),
        L(None, 'وأنا رأيت مجموعة من الوعول ترعى عند الأفق. المسافة بعيدة، ولكن الأمر يستحق المغامرة.', "And I saw a herd of ibex grazing on the horizon. It's a long way — but worth the risk.", PACK),
        L(LEADER, 'قنّاص، جاء دورك في الكلام.', 'Qannāṣ — your turn to speak.'),
        L(QANNAS, 'في اتجاه الشمال خيمة يعيش فيها عشرة رجال، يخرجون للرعي ومعهم قطيع من الخراف والنعاج والخيول، تحرسهم ستة كلاب، والرجال مسلّحون جيداً.',
          "To the north there's a tent where ten men live. They go out to graze a flock of rams, ewes and horses. Six dogs guard them, and the men are well armed.",
          'عشرة رجال: إخوة يوسف | ten men: Joseph\'s brothers'),
        L(LEADER, 'نحن دائماً نختار أكبر الأهداف وأكثرها صعوبة. أعتقد أن الأمر محسوم: سنتّجه إلى الشمال حيث أشار قنّاص.',
          "We always choose the biggest and hardest targets. I think it's settled: we'll head north, where Qannāṣ has pointed."),
        L(QANNAS, 'أمرك يا سيدي القائد.', 'As you command, sir.'),
        L(LEADER, 'أنت الذي ستقود القافلة يا قنّاص. لقد كبرت وثقلت حركتي، وأنت أفضل من يتولّى القيادة من بعدي. هيا، رحّبوا بالقائد الجديد!',
          "You're the one who will lead the pack, Qannāṣ. I've grown old and slow, and you are the best to take the lead after me. Come — welcome your new leader!"),
        L(None, 'انتبه! القائد قنّاص!', 'Attention! Leader Qannāṣ!', PACK),
        L(None, 'عفواً سيدي القائد…', 'Excuse me, sir…', 'ذئب صغير | a young wolf'),
        L(QANNAS, 'هذه أول مرة تخرجان للصيد؟', "Is this the first time you two have been out hunting?"),
        L(None, 'نعم يا سيدي.', 'Yes, sir.', 'ذئب صغير | a young wolf'),
        L(QANNAS, 'هل هو أخوك؟', 'Is he your brother?'),
        L(None, 'نعم يا سيدي.', 'Yes, sir.', 'ذئب صغير | a young wolf'),
        L(QANNAS, 'فلينتبه كلٌّ منكما إلى الآخر؛ إن الأخ لا يمكن تعويضه أبداً. أتفهم؟', "Then each of you watch out for the other. A brother can never be replaced. Understand?"),
        L(None, 'أمرك يا سيدي.', 'Yes, sir.', 'ذئب صغير | a young wolf'),
    ]),
    dict(title_ar='المشهد الثاني عشر — الفخّ', title_en='Scene 12 — The Trap',
         icon='drop.fill', era='present',
         summary_en='The wolf is taken, and the brothers bring their father a bloodied shirt — and a bound, innocent wolf.',
         lines=[
        L(None, 'لماذا توقّفت؟', 'Why have you stopped?', PACK),
        L(QANNAS, 'لا أدري، أشعر بعدم الارتياح.', "I don't know. I have a bad feeling."),
        L(JASURA, 'تشجّع يا حبيبي، القافلة تنتظر حركة القائد.', 'Be brave, my love — the pack is waiting for its leader to move.'),
        L(QANNAS, 'انتبهوا جيداً، سأكون أول من يصيد النعاج.', "Watch closely — I'll be the first to take a ewe.", caption('النعاش', 'النعاج')),
        L(JASURA, 'لا! قنّاص! قنّاص!', 'No! Qannāṣ! Qannāṣ!'),
        L(NARR, 'قَالُوا يَا أَبَانَا إِنَّا ذَهَبْنَا نَسْتَبِقُ وَتَرَكْنَا يُوسُفَ عِندَ مَتَاعِنَا فَأَكَلَهُ الذِّئْبُ ۖ وَمَا أَنتَ بِمُؤْمِنٍ لَّنَا وَلَوْ كُنَّا صَادِقِينَ',
          "They said, 'Our father, we went off racing one another and left Joseph with our belongings — and the wolf ate him. But you will not believe us, even though we are telling the truth.'",
          "آية قرآنية — سورة يوسف ١٢:١٧ | Qur'an 12:17"),
        L(NARR, 'صدق الله العظيم.', 'God Almighty has spoken the truth.'),
        L(SHEP, 'وسقط الذئب البريء في يد إخوة يوسف، وأدرك قنّاص كيف سقط أخوه من قبل بإحدى حيل الصيّادين، لكنه لم يكن مدركاً ما يحدث حوله من تفاصيل المؤامرة.',
          "And the innocent wolf fell into the hands of Joseph's brothers. Qannāṣ understood now how his brother had been caught before, by one of the hunters' tricks — but he did not grasp the details of the plot unfolding around him.",
          caption('اخوه يوسف', 'إخوة يوسف')),
        L(SHEP, 'لقد ذبح إخوة النبي يوسف عليه السلام شاةً، وألقوا بعض دمائها على فم الذئب المقيّد، ثم أحضروا قميص أخيهم يوسف ولطّخوه بالدم الكاذب، حتى يعتقد والدهم أن الذئب أكل النبي الكريم، وها هو قميصه ملطّخ بالدماء دليلاً على أقوالهم.',
          "The brothers of the Prophet Joseph, peace be upon him, slaughtered a sheep and smeared some of its blood on the bound wolf's mouth. Then they took their brother Joseph's shirt and stained it with the false blood, so their father would believe the wolf had eaten the noble prophet — and there was his shirt, soaked in blood, to prove their words.",
          caption('لقد ذبح اخوه … ولطخ', 'لقد ذبح إخوة … ولطّخوه') + " — صدى لقوله تعالى: ﴿وَجَاءُوا عَلَىٰ قَمِيصِهِ بِدَمٍ كَذِبٍ﴾ يوسف ١٢:١٨ | echoes Qur'an 12:18"),
        L(SHEP, 'واصطحبوا الذئب مقيّداً بالحبال، وحملوه إلى أبيهم. وفي الغد إن شاء الله أكمل لكم ما حدث لذئب يوسف.',
          "And they took the wolf, bound with ropes, and carried him to their father. Tomorrow, God willing, I'll tell you the rest of what happened to Joseph's wolf.",
          caption('واصطحب', 'واصطحبوا')),
    ]),
]

for i, s in enumerate(SCENES, 1):
    s['scene_no'] = i

NOTES = (
    "Reconstructed from the raw auto-generated YouTube captions (ar_text_unit.text_ar) alone, by reading the "
    "Arabic: its grammar, the sense of the scene, and Sūrat Yūsuf, which the brothers' plot follows almost word "
    "for word (12:8–10, 12:13, 12:18 — each flagged where it is echoed), with 12:17 recited in full from the "
    "muṣḥaf. The names are the captions' own: Qannāṣ («hunter»), Miqdām («bold»), Jasūra («daring»). The "
    "archive's machine English was not used. Each repaired caption word is flagged in its line's note with what "
    "the captions heard. Speakers are named where the dialogue makes them plain and left unnamed where it does "
    "not. The English is a fresh translation of the reconstructed Arabic, written as script.")

DOC = dict(
    title_ar='ذئب يوسف - ج 1',
    title_en="Joseph's Wolf — Episode 7 (Part 1)",
    series_ar='قصص الحيوان في القرآن', series_en="Animal Stories from the Qur'an", episode=7,
    video_url='https://www.youtube.com/watch?v=4I3XHnmiiR8',
    acq_ref_id='ACQ:YT:4I3XHnmiiR8', source_text_unit_id=UNIT,
    reconstruction_notes=NOTES,
    cast=CAST,
    scenes=[{k: s[k] for k in ('scene_no', 'title_ar', 'title_en', 'icon', 'era', 'summary_en', 'lines')} for s in SCENES],
)

if __name__ == '__main__':
    j = json.dumps(DOC, ensure_ascii=False, separators=(',', ':')).replace("'", "''")
    print(f"UPDATE ar_text_unit SET script_json = '{j}' WHERE id = '{UNIT}';")
