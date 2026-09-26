# -*- coding: utf-8 -*-
"""The script of «طير إبراهيم — ج 1» (Animal Stories from the Qur'an, ep. 5),
reconstructed from the raw YouTube auto-captions in ar_text_unit.text_ar by
reading the Arabic alone — its grammar, the scene, and the Qur'an it echoes.
The archive's machine English is not used; the English here is translated
fresh from the reconstructed Arabic.

    python3 scripts/episodes/apply.py tayr_ep1
"""
import json

UNIT = 'ARTX:YT-FIjBpbQRj4E:1'

STORY, JANAH, NASHA = 'الراوي', 'جناح', 'ناشا'
ROOSTER, PEACOCK, NARR = 'الديك', 'الطاووس', 'راوٍ'

CAST = [
    dict(name_ar=STORY, name_en='The Storyteller', role_en='tells the doves the story', icon='person.wave.2.fill'),
    dict(name_ar=JANAH, name_en='Janāḥ', role_en='leader of the flock — whose name means "wing"', icon='bird.fill'),
    dict(name_ar=NASHA, name_en='Nāshā', role_en='a young dove; Nūshkā, until he renamed her', icon='heart.fill'),
    dict(name_ar=ROOSTER, name_en='The Rooster', role_en="calls the dawn at Ibrāhīm's house", icon='sunrise.fill'),
    dict(name_ar=PEACOCK, name_en='The Peacock', role_en='admires his own feathers', icon='sparkles'),
    dict(name_ar=NARR, name_en='Narrator', role_en='recites the āyah', icon='book.closed.fill'),
]


def L(speaker, ar, en, note=None):
    d = dict(speaker=speaker, ar=ar, en=en)
    if note: d['note'] = note
    return d


def caption(heard, read):
    return f'الأصل في التفريغ: «{heard}» — رُجّحت «{read}» اعتماداً على السياق والنحو'


UNNAMED = 'المتكلم لا يُسمّى | the speaker is unnamed'
EGYPT = 'بالعامية المصرية: «هـ» علامة المستقبل | Egyptian «ha-» marks the future'

SCENES = [
    dict(title_ar='المشهد الأول — رمز السلام', title_en='Scene 1 — The Sign of Peace',
         icon='leaf.fill', era='present',
         summary_en="Why the dove means peace — and another story doves lived, in Abraham's time.",
         lines=[
        L(STORY, 'السلام عليكم يا أحبائي. هل تعرفون أنكم رمز السلام في هذا العالم؟',
          "Peace be upon you, my dear ones. Did you know that you are the sign of peace in this world?",
          '[يخاطب الحمام | to the doves]'),
        L(STORY, 'عندما بنى سيدنا نوح عليه الصلاة والسلام سفينته، حمل فيها زوجاً من كل الحيوانات والطيور مع المؤمنين من قومه، ثم جاء الطوفان ليبتلع الكفّار.',
          'When our master Noah, peace be upon him, built his ship, he carried in it a pair of every animal and bird, with the believers among his people. Then the Flood came to swallow up the disbelievers.',
          caption('للع', 'ليبتلع')),
        L(STORY, 'وحين كفّ الطوفان عن تدفّقه واستسلم لكلمة الله، حملت إحدى الحمائم غصن زيتون من الأرض إلى سفينة نوح، لتدلّ على قرب اليابسة. من يومها صار الحمام رمزاً للسلام.',
          "And when the Flood stopped pouring and yielded to the word of God, one of the doves carried an olive branch from the land to Noah's ship, to show that dry ground was near. From that day, the dove has been the sign of peace.",
          caption('كفى … لسفينه', 'كفّ … إلى سفينة')),
        L(STORY, 'هناك حكاية أخرى عاشها الحمام في زمن أبي الأنبياء، سيدنا إبراهيم عليه الصلاة والسلام.',
          'There is another story the doves lived, in the time of the father of the prophets, our master Abraham, peace be upon him.'),
        L(STORY, 'كانت الطيور من مختلف الأنواع تستمتع بالحياة قرب بيت إبراهيم عليه السلام، حيث تجد الأمان والطعام والرعاية، ويملأ آذانها صوت تسبيح أبي الأنبياء في خلوته وهو يناجي ربه.',
          "Birds of every kind enjoyed life near Abraham's house. There they found safety, food and care, and their ears were filled with the sound of the father of the prophets glorifying God in his solitude, as he spoke to his Lord in private.",
          caption('تست بالحياه', 'تستمتع بالحياة')),
    ]),
    dict(title_ar='المشهد الثاني — السرب', title_en='Scene 2 — The Flock',
         icon='bird', era='past',
         summary_en='A young dove is tired, the leader flies too fast — and nobody talks back to Janāḥ.',
         lines=[
        L(None, 'لماذا لا يخفّف القائد سرعته؟ لقد تعبت أجنحتي من كثرة الارتفاع وطول المسافة. سأصيح عليه وأطلب منه أن يراعي ضعفنا.',
          "Why won't the leader slow down? My wings are worn out from flying so high and so far. I'll call out to him and ask him to think of how weak we are.",
          caption('اجنحتها … ساص', 'أجنحتي … سأصيح') + ' · ' + 'لا يسمّيها التفريغ؛ لعلّها نوشكا | unnamed — perhaps Nūshkā'),
        L(None, 'إياكِ أن تفعلي هذا! إن القائد جناح حادّ الطباع، لا يسمح بالمناقشة أثناء قيادته للسرب.',
          "Don't you dare! Janāḥ, our leader, has a sharp temper — he allows no arguing while he's leading the flock.",
          'حمامة من السرب | a dove of the flock'),
        L(JANAH, 'أسمع صوتاً في آخر السرب! مَن تردّ الكلام تنفصل عنّا!',
          "I hear a voice at the back of the flock! Whoever answers back leaves us!"),
        L(None, 'لماذا يتحدّث بهذا الاستعلاء؟', 'Why does he talk so high-handedly?', 'لا يسمّيها التفريغ؛ لعلّها نوشكا | unnamed — perhaps Nūshkā'),
        L(None, 'اصمتي!', 'Hush!'),
        L(JANAH, 'سوف نرتاح قليلاً عند مجرى النهر. يمكنكم الشرب وتناول الحبوب، ولكن أسرعوا.',
          "We'll rest a little at the riverbed. You may drink and eat some grain — but be quick."),
    ]),
    dict(title_ar='المشهد الثالث — عند مجرى النهر', title_en='Scene 3 — At the Riverbed',
         icon='water.waves', era='past',
         summary_en='A speck of dust, a stern leader who is kinder than he seems — and a new name.',
         lines=[
        L(JANAH, 'هل أنتِ بخير؟', 'Are you all right?'),
        L(NASHA, 'ماذا؟ إنني بخير يا سيدي القائد. لقد كانت ذرّة تراب.', "What? I'm fine, sir — commander. It was just a speck of dust.",
          caption('يا سي القائد', 'يا سيدي القائد')),
        L(JANAH, 'افتحي عينيك الآن. هل الأمر خطير؟', 'Open your eyes now. Is it serious?'),
        L(NASHA, 'نعم… أقصد: لا.', 'Yes… I mean — no.'),
        L(JANAH, 'سنواصل الطيران. كنت مارّاً بالصدفة ووجدتك تقفين هنا، فقلت: إنه من الواجب أن أطمئنّ عليكِ.',
          "We'll fly on. I happened to be passing, and found you standing here, so I thought it only right to see that you were all right.",
          caption('مرا', 'مارّاً')),
        L(NASHA, 'هذا كرمٌ منك يا سيدي القائد.', "That's kind of you, commander."),
        L(JANAH, 'كيف حال عينيك الآن؟', 'How are your eyes now?'),
        L(NASHA, 'لا أعرف، كيف تراهما؟', "I don't know — how do they look to you?"),
        L(JANAH, 'أرى أنهما… سبحان الله!', 'I see that they are… glory be to God!'),
        L(NASHA, 'ماذا؟', 'What?'),
        L(JANAH, 'لا أثر للتراب.', "There's no trace of the dust."),
        L(NASHA, 'لقد شُفيت، والحمد لله.', "I'm healed, praise be to God."),
        L(JANAH, 'يجب أن أطير.', 'I must fly.'),
        L(NASHA, 'لماذا؟… أقصد: هل يمكنني أن أستفيد من خبرتك في الطيران؟', "Why?… I mean — could I learn something from your skill in flying?"),
        L(JANAH, 'بكل تأكيد. اسألي وأُجيب.', 'Of course. Ask, and I will answer.'),
        L(NASHA, 'كيف أكون في مهارتك وسرعتك في الطيران؟', 'How can I fly as skilfully and as fast as you?'),
        L(JANAH, 'بالحب.', 'By love.'),
        L(NASHA, 'الحب؟', 'Love?'),
        L(JANAH, 'نعم. أنا أحبّ الطيران، ولهذا لا أملّ من التدريب. أحبّ السماء، وأحبّ الهواء الذي يحملني؛ أشعر بالزهو حين أرفرف بأجنحتي وأحلّق إلى أعلى.',
          "Yes. I love flying — that's why I never tire of practice. I love the sky, and I love the air that carries me. I feel proud when I beat my wings and soar higher.",
          caption('باجنحته', 'بأجنحتي')),
        L(JANAH, 'حمداً لله أن خلقني طيراً! لست أعرف كيف تحتمل الخلائق التي تدبّ على الأرض حياتها. في الطيران ألف متعة، لا تكشف عن نفسها إلا لمن يرتفع.',
          "Thank God He made me a bird! I don't know how the creatures that crawl on the earth can bear their lives. In flight there are a thousand delights — and they show themselves only to those who rise."),
        L(NASHA, 'أريد درساً عملياً. هل يمكنني أن أطير خلفك؟', 'I want a real lesson. May I fly behind you?'),
        L(JANAH, 'بل تطيرين إلى جانبي. هيا بنا.', "No — you'll fly beside me. Let's go."),
        L(NASHA, 'وماذا تحبّ أيضاً غير السماء والهواء؟', 'And what else do you love, besides the sky and the air?'),
        L(JANAH, 'أحبّ خالقنا الذي أوجدنا من العدم، وأحبّ نبيّه الكريم إبراهيم عليه الصلاة والسلام. يقشعرّ جسدي وأخفض أجنحتي عندما يُذكر أمامي سيدنا إبراهيم، خليل الله.',
          "I love our Creator, who brought us out of nothing — and I love His noble prophet Abraham, peace be upon him. My whole body shivers and I lower my wings whenever our master Abraham, the Friend of God, is mentioned in front of me."),
        L(JANAH, 'آه، كم أحبّه! ألقاه أعداؤه في النار، فانطفأت أمام نار السماء التي تشتعل في قلبه. لا تحرق النارُ ناراً أعظم منها، وليس أعظمَ من نار الحب.',
          "Ah, how I love him! His enemies threw him into the fire — and it died down before the fire of heaven burning in his heart. Fire cannot burn a fire greater than itself, and nothing is greater than the fire of love.",
          caption('ياه … فانتفض', 'آه … فانطفأت')),
        L(NASHA, 'لا أفهم كلامك، ولكنّي أتوق إلى سماعه.', "I don't understand what you're saying — but I long to hear it.",
          caption('ولكني تح إلى سماعه', 'ولكنّي أتوق إلى سماعه')),
        L(JANAH, 'ما اسمك؟', "What's your name?"),
        L(NASHA, 'اسمي نوشكا.', 'My name is Nūshkā.'),
        L(JANAH, 'يجب أن تغيّري هذا الاسم.', 'You must change that name.'),
        L(NASHA, 'أغيّر اسمي؟', 'Change my name?'),
        L(JANAH, 'سأسمّيكِ ناشا.', "I'll call you Nāshā."),
        L(NASHA, 'ناشا؟', 'Nāshā?'),
        L(JANAH, 'عندما نحبّ نولد من جديد، وبما أننا قد وُلدنا الآن، فنحن نحتاج إلى أسماء جديدة.', "When we love, we're born again — and since we have just been born, we need new names."),
        L(NASHA, 'الريح تحمل كلماتك بعيداً فلا أسمعك!', "The wind is carrying your words away — I can't hear you!"),
        L(JANAH, 'يجب أن نعود.', 'We must go back.'),
    ]),
    dict(title_ar='المشهد الرابع — الديك والطاووس', title_en='Scene 4 — The Rooster and the Peacock',
         icon='sunrise.fill', era='past',
         summary_en="Every dawn at Abraham's house, the same quarrel: which of them is more use to the Prophet?",
         lines=[
        L(ROOSTER, 'كوكو!', 'Cock-a-doodle-doo!'),
        L(PEACOCK, 'كفاك إزعاجاً أيها الديك! ألا يمكننا أن نرتاح قليلاً في هذا المكان؟', "Enough of your racket, rooster! Can't we get a little rest around here?"),
        L(ROOSTER, 'اصمت أيها الطاووس الكسول! إنني أؤدّي واجبي: أنبّه سيد هذه الأرض، خليل الله، إلى بداية يوم جديد.',
          "Quiet, you lazy peacock! I'm doing my duty: waking the master of this land, the Friend of God, to the start of a new day."),
        L(PEACOCK, 'ومن قال لك إنه نائم؟ هو دائم التسبيح والصلاة.', "And who told you he's asleep? He's forever glorifying God and praying."),
        L(ROOSTER, 'هذا لا يمنعني أن أؤدّي عملي؛ فأنا آكل وأشرب من أجل أن أصيح، وأؤذّن عند كل فجر.', "That doesn't stop me doing my job. I eat and drink so that I can crow — and call out at every dawn."),
        L(PEACOCK, 'تبحث لنفسك عن دور لم يكلّفك به أحد.', "You're making up a job for yourself that nobody gave you."),
        L(ROOSTER, 'وما دورك أنت أيها الطاووس؟ ها؟', "And what's your job, peacock? Hm?"),
        L(PEACOCK, 'ها! يكفي أن يتأمّل الناس جمالي: ريشي الملوّن، ورقصتي المبدعة في موسم التزاوج.',
          "Ha! It's enough that people gaze at my beauty: my coloured feathers, and my brilliant dance in the mating season.",
          caption('ريش الملون', 'ريشي الملوّن')),
        L(ROOSTER, 'ها! ألا تخجل من نفسك؟', "Ha! Aren't you ashamed of yourself?"),
        L(None, 'الرحمة! كل يوم، كل يوم أستيقظ على نفس المشاجرة ونفس الحديث!', 'Mercy! Every day — every single day I wake up to the same quarrel, the same talk!', 'لا يسمّيه التفريغ؛ لعلّه جناح | unnamed — perhaps Janāḥ'),
        L(ROOSTER, 'قل له: مَن منّا أكثر فائدة لنبيّ الله؟', "Tell him: which of us is more use to God's Prophet?"),
        L(None, 'لا فائدة فيكما! قلت لكما ألف مرة: إن سيدنا إبراهيم يطعمنا جميعاً ويحنو علينا تقرّباً إلى الله وحده، لا من أجل الصياح في الفجر أو الرقصة المبدعة.',
          "Neither of you is any use! I've told you a thousand times: our master Abraham feeds us all and cares for us to draw near to God alone — not for crowing at dawn, or for brilliant dances.",
          caption('فاعده … ويحن … الرق', 'فائدة … ويحنو … الرقصة') + ' · ' + 'لا يسمّيه التفريغ؛ لعلّه جناح | unnamed — perhaps Janāḥ'),
    ]),
    dict(title_ar='المشهد الخامس — نصف قلبي', title_en='Scene 5 — Half My Heart',
         icon='heart.fill', era='past',
         summary_en='She thinks she is not beautiful; he gives her half his heart — and a cold fear.',
         lines=[
        L(NASHA, 'قل لي يا جناح: كيف تريدني أن أكون؟', 'Tell me, Janāḥ — how do you want me to be?'),
        L(JANAH, 'لا أريد غيرك، أريدك كما أنتِ.', "I don't want anyone but you. I want you just as you are."),
        L(NASHA, 'لكنّني لست جميلة، أنت أجمل مني بكثير.', "But I'm not beautiful. You're far more beautiful than me."),
        L(JANAH, 'هذا أمر طبيعي؛ إن ذكور الحمام أجمل شكلاً من الإناث. ولكن ما علاقة الجمال بالحب؟',
          "That's only natural — male doves are finer-looking than females. But what does beauty have to do with love?"),
        L(NASHA, 'بقيّة الحمام لا يحبّني… إنهم لا يطعمونني.', "The other doves don't love me… they don't feed me.",
          caption('لا يطعمني', 'لا يطعمونني')),
        L(JANAH, 'أُطعمكِ نصف قلبي، والنصف الثاني… قد تجوعين مرة ثانية.', "I'll feed you half my heart — and the other half… in case you're hungry again.",
          'في التفريغ فجوة بعد «والنصف الثاني» | a gap in the captions after «the other half»'),
        L(JANAH, 'هيا نبدأ الدرس.', "Come on — let's start the lesson."),
        L(NASHA, 'أريد أن أطير.', 'I want to fly.'),
        L(JANAH, 'ماذا بكِ؟', "What's wrong?"),
        L(NASHA, 'اعتصر قلبي شيءٌ بارد. هل سيخبّئ لنا حبّنا قدراً من الألم؟ هل سيموت أحدنا قبل الآخر؟ أريدك جواري وأنا أموت.',
          'Something cold has gripped my heart. Is our love hiding some pain for us? Will one of us die before the other? I want you beside me when I die.',
          caption('هيكون … هيموت', 'هل سيكون … هل سيموت') + ' — ' + EGYPT),
        L(JANAH, 'لم تبدأ الحياة بعد! لم يكن الموت مُحزناً قبل أن أعرفك. أريد أن أعيش طويلاً.',
          "Life hasn't even begun! Death never seemed sad before I knew you. I want to live a long time.",
          caption('محسنا', 'مُحزناً')),
    ]),
    dict(title_ar='المشهد السادس — الوطن', title_en='Scene 6 — Home',
         icon='house.fill', era='past',
         summary_en='Home, he says, is half in his heart and half in hers. Then he loses his way among the eagles.',
         lines=[
        L(NASHA, 'يا لها من نزهة طويلة! ما أجمل العودة إلى الوطن.', 'What a long outing! How lovely it is to come home.'),
        L(JANAH, 'إنني لا أعتبر الوطن هو المكان الذي وُلدت فيه، أو الذي أعود إليه من الطيران.', "I don't count home as the place I was born, or the place I come back to after flying."),
        L(NASHA, 'وأين وطنك إذاً؟', 'Then where is your home?'),
        L(JANAH, 'إنني أحمل نصفه في قلبي، والنصف الثاني في قلب من أحبّ. ناشا، هل تسمعينني؟',
          'I carry half of it in my heart — and the other half in the heart of the one I love. Nāshā, can you hear me?'),
        L(JANAH, 'لقد نامت المسكينة. كانت الرحلة طويلة عليها، لكنها لم تأكل شيئاً طوال اليوم! كيف فاتني أن أطعمها؟',
          "She's asleep, poor thing. The journey was long for her — but she hasn't eaten a thing all day! How did I forget to feed her?"),
        L(JANAH, 'أين ذهبت حبّات القمح التي كانت تلمع في ضوء الشمس؟ سأطير قليلاً لأحدّد الاتجاه.',
          "Where have the grains of wheat gone, the ones that shone in the sunlight? I'll fly a little way to find my bearings.",
          caption('سارت قليلا', 'سأطير قليلاً')),
        L(JANAH, 'إن بصري يخدعني، وجناحي يؤلمني، وذهني مشتّت. أين أنا؟ يا إلهي… منطقة النسور! يا للهول!',
          "My eyes are deceiving me, my wing hurts, my mind is scattered. Where am I? My God… eagle country! How terrible!",
          caption('مشدد … النصور', 'مشتّت … النسور')),
        L(JANAH, 'الحمد لله… الحمد لله.', 'Praise be to God… praise be to God.', '[ينجو ويعود | he escapes and returns]'),
        L(NASHA, 'حبيبي!', 'My love!'),
        L(JANAH, 'أين أنا؟', 'Where am I?'),
        L(NASHA, 'الحمد لله! أنت في وطنك يا حبيبي… في قلب من تحب.', "Praise be to God! You're home, my love — in the heart of the one you love.",
          caption('في قلبي من تحب', 'في قلب من تحب') + ' — صدى لكلامه عن الوطن | his own words about home, returned'),
    ]),
    dict(title_ar='المشهد السابع — العرس', title_en='Scene 7 — The Wedding',
         icon='sparkles', era='past',
         summary_en="Janāḥ and Nāshā are married before Abraham — and the peacock finally gets to dance.",
         lines=[
        L(PEACOCK, 'أرأيت؟ أرأيت فوائد الرقص أيها المزعج؟', 'You see? You see what dancing is good for, you pest?'),
        L(ROOSTER, 'إنه يرقص! إنه يستحق الذبح!', "He's dancing! He deserves to have his throat cut!"),
        L(None, 'هذا يوم فرح، تمالك أعصابك؛ نحن في عرس.', "This is a happy day — keep your temper. We're at a wedding.", UNNAMED),
        L(NASHA, 'سعادتي اليوم لا توصف: تزوّجتك، ونلت شرف أن أمثُل بين يدي سيدنا إبراهيم عليه السلام.',
          "My happiness today is beyond words: I've married you, and had the honour of standing before our master Abraham, peace be upon him."),
    ]),
    dict(title_ar='المشهد الثامن — ما سمعه الديك', title_en='Scene 8 — What the Rooster Heard',
         icon='ear.fill', era='past',
         summary_en='The rooster missed the dawn call. Before dawn, he heard Abraham ask his Lord how He gives life to the dead.',
         lines=[
        L(NASHA, 'إن صديقك لم يؤذّن في الفجر كعادته.', "Your friend didn't call at dawn as he always does."),
        L(PEACOCK, 'ربما لم نسمع صوته لأن الريح كانت شديدة.', "Maybe we didn't hear him because the wind was strong."),
        L(JANAH, 'ماذا بك أيها الديك؟ لم تنطق بكلمة.', "What's the matter, rooster? You haven't said a word."),
        L(ROOSTER, 'لن تصدّقوا.', "You won't believe it."),
        L(JANAH, 'بل نصدّقك. ماذا حدث؟', 'Yes we will. What happened?'),
        L(ROOSTER, 'استيقظت قبل الفجر، فسمعت سيدنا إبراهيم يناجي ربّه. كان يسأله عن كيفيّة إحياء الموتى، وسمعت شيئاً عن ذبح أربعة من الطير.',
          'I woke before dawn and heard our master Abraham speaking privately to his Lord. He was asking Him how He gives life to the dead — and I heard something about slaughtering four birds.',
          caption('قبل الف', 'قبل الفجر') + " — صدى لقوله تعالى: ﴿رَبِّ أَرِنِي كَيْفَ تُحْيِي الْمَوْتَىٰ … فَخُذْ أَرْبَعَةً مِّنَ الطَّيْرِ﴾ البقرة ٢:٢٦٠ | echoes Qur'an 2:260"),
    ]),
    dict(title_ar='المشهد التاسع — بيضتان', title_en='Scene 9 — Two Eggs',
         icon='gift.fill', era='past',
         summary_en='Months married, and a surprise in the nest. He flies off to fetch breakfast.',
         lines=[
        L(JANAH, 'صباح الخير يا حبيبتي، تعالي لتشاركيني استنشاق النسمات المنعشة. من يصدّق أننا قد تزوّجنا منذ شهور؟ إنه الأمس القريب!',
          "Good morning, my love — come and breathe the fresh breeze with me. Who'd believe we've been married for months? It feels like yesterday!"),
        L(JANAH, 'ناشا، توقّفي عن الكسل، وإلا سآتي لكِ وأشدّكِ شدّاً!', "Nāshā, stop being lazy — or I'll come and pull you out!"),
        L(NASHA, 'انتظر، ستُفسد المفاجأة! انظر!', "Wait — you'll spoil the surprise! Look!"),
        L(JANAH, 'ماذا؟ لا أصدّق! سأصبح أباً لاثنين من الحمام! اللهمّ بارك لنا فيهما.', "What? I can't believe it! I'm going to be the father of two doves! O God, bless them for us."),
        L(JANAH, 'إياكِ أن تُتعبي نفسك. سأطير لإحضار الإفطار.', "Don't you tire yourself out. I'll fly and fetch breakfast."),
    ]),
    dict(title_ar='المشهد العاشر — المهمة', title_en='Scene 10 — The Summons',
         icon='hand.raised.fill', era='past',
         summary_en='A power he cannot name draws Janāḥ to Abraham — who holds him in one hand, and something shining in the other.',
         lines=[
        L(JANAH, 'ما الذي جاء بي إلى هذا الطريق؟ لا توجد حقول قمح في هذه الناحية. ما الذي يحدث؟',
          "What brought me this way? There are no wheatfields over here. What's happening?"),
        L(JANAH, 'أشعر كأنّ قوّة عظيمة تحرّك إرادتي، وتدفعني إلى الطيران في هذه الناحية، كأنما قد كُلّفت بمهمّة عسكرية بالغة السرّية.',
          "I feel as if some great power is moving my will, pushing me to fly this way — as though I'd been given a top-secret military mission."),
        L(NASHA, 'يا لحظّك الجميل يا زوجي الحبيب! تطير بالقرب من سيدنا إبراهيم، وتتنشّق الهواء الذي يتنفّسه.',
          "How lucky you are, my dear husband! Flying close to our master Abraham, breathing the air he breathes.",
          caption('وتتش', 'وتتنشّق')),
        L(NASHA, 'إن سيدنا إبراهيم عليه الصلاة والسلام يحمل أباكما بيده الكريمة، ويحمل بيده الأخرى شيئاً يلمع… لا! هل يُعقل؟',
          "Our master Abraham, peace be upon him, is holding your father in his noble hand — and in his other hand he's holding something that shines… No! Can it be?",
          '[تخاطب بيضتيها | to her two eggs]'),
        L(None, 'هذا ذابحُك، صاحبُ الفضل عليك.', 'This is the one who will slaughter you — the one to whom you owe everything.',
          caption('هذا ذبحك', 'هذا ذابحُك') + ' · ' + UNNAMED),
        L(NASHA, 'لا يا سيدي الكريم، أتوسّل إليك، لا! اذبحني أنا بدلاً منه! لا، لا!', "No, my noble master — I beg you, no! Slaughter me instead of him! No, no!"),
        L(NARR, 'وَقَالَ الَّذِينَ أُوتُوا الْعِلْمَ وَالْإِيمَانَ لَقَدْ لَبِثْتُمْ فِي كِتَابِ اللَّهِ إِلَىٰ يَوْمِ الْبَعْثِ ۖ فَهَٰذَا يَوْمُ الْبَعْثِ وَلَٰكِنَّكُمْ كُنتُمْ لَا تَعْلَمُونَ',
          "And those given knowledge and faith will say: 'You remained, by God's decree, until the Day of Rising. This is the Day of Rising — but you did not know.'",
          "آية قرآنية — سورة الروم ٣٠:٥٦ | Qur'an 30:56"),
        L(NARR, 'صدق الله العظيم.', 'God Almighty has spoken the truth.'),
    ]),
    dict(title_ar='المشهد الحادي عشر — ما بعد الموت', title_en='Scene 11 — After Death',
         icon='moon.stars.fill', era='present',
         summary_en='Why the birds were slaughtered: not cruelty, but a sign — death is a stage, and after it comes rising.',
         lines=[
        L(STORY, 'ذبح سيدنا إبراهيم الطير كما أمره ربّه. لم يكن الذبح قسوة على الطير، وإنما كان رحمة بهم، وبقلب خليل الله.',
          "Our master Abraham slaughtered the birds as his Lord commanded. The slaughter was not cruelty to the birds — it was mercy, to them and to the heart of the Friend of God."),
        L(STORY, 'أراد الله أن يُريه آية الخلق، ويُطلعه على سرّ من أسرار الوجود، هو سرّ ما بعد الموت.',
          'God wished to show him the sign of creation, and let him see one of the secrets of existence: the secret of what comes after death.'),
        L(STORY, 'كان كثير من الناس يعتقدون أن الموت يعني الفناء والعدم وانتهاء كل شيء، بينما الموت في الحقيقة مرحلة من مراحل الوجود تمرّ على كل كائن حيّ، ويأتي من بعدها البعث والعودة إلى الحياة.',
          "Many people believed that death meant annihilation, nothingness, the end of everything. But in truth death is one stage of existence, which every living thing passes through — and after it come the rising, and the return to life."),
        L(STORY, 'غداً أكمل لكم قصّة طير إبراهيم عليه السلام.', "Tomorrow I'll finish telling you the story of Abraham's birds, peace be upon him."),
    ]),
]

for i, s in enumerate(SCENES, 1):
    s['scene_no'] = i

NOTES = (
    "Reconstructed from the raw auto-generated YouTube captions (ar_text_unit.text_ar) alone, by reading the "
    "Arabic: its grammar, the sense of the scene, its Egyptian touches («هيكون، هيموت» = سيكون، سيموت), and the "
    "Qur'an it echoes — al-Baqara 2:260 for the four birds, and al-Rūm 30:56 recited in full from the muṣḥaf. The "
    "archive's machine English was not used. The leader's name, Janāḥ, is given by the captions themselves («إن "
    "القائد جناح حادّ الطباع», «قل لي يا جناح»). Each repaired caption word is flagged in its line's note with "
    "what the captions heard; a gap is marked where the captions skip. Speakers are named where the dialogue "
    "makes them plain and left unnamed where it does not. The English is a fresh translation of the "
    "reconstructed Arabic, written as script.")

DOC = dict(
    title_ar='طير إبراهيم - ج 1',
    title_en="Abraham's Birds — Episode 5 (Part 1)",
    series_ar='قصص الحيوان في القرآن', series_en="Animal Stories from the Qur'an", episode=5,
    video_url='https://www.youtube.com/watch?v=FIjBpbQRj4E',
    acq_ref_id='ACQ:YT:FIjBpbQRj4E', source_text_unit_id=UNIT,
    reconstruction_notes=NOTES,
    cast=CAST,
    scenes=[{k: s[k] for k in ('scene_no', 'title_ar', 'title_en', 'icon', 'era', 'summary_en', 'lines')} for s in SCENES],
)

if __name__ == '__main__':
    j = json.dumps(DOC, ensure_ascii=False, separators=(',', ':')).replace("'", "''")
    print(f"UPDATE ar_text_unit SET script_json = '{j}' WHERE id = '{UNIT}';")
