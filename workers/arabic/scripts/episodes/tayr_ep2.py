# -*- coding: utf-8 -*-
"""The script of «طير إبراهيم — ج 2» (Animal Stories from the Qur'an, ep. 6),
reconstructed from the raw YouTube auto-captions in ar_text_unit.text_ar by
reading the Arabic alone — its grammar, the scene, and the Qur'an it echoes.
The archive's machine English is not used; the English here is translated
fresh from the reconstructed Arabic.

    python3 scripts/episodes/apply.py tayr_ep2
"""
import json

UNIT = 'ARTX:YT-ux92Uvhkp50:1'

STORY, JANAH, NASHA = 'الراوي', 'جناح', 'ناشا'
ROOSTER, HEN, PEACOCK, PEAHEN, CROW, NARR = 'الديك', 'الدجاجة', 'الطاووس', 'زوجة الطاووس', 'الغراب', 'راوٍ'

CAST = [
    dict(name_ar=STORY, name_en='The Storyteller', role_en='finishes the story for the doves', icon='person.wave.2.fill'),
    dict(name_ar=JANAH, name_en='Janāḥ', role_en='the dove — one of the four birds', icon='bird.fill'),
    dict(name_ar=NASHA, name_en='Nāshā', role_en='his wife, who saw the knife', icon='heart.fill'),
    dict(name_ar=ROOSTER, name_en='The Rooster', role_en='one of the four — home to a frightened family', icon='sunrise.fill'),
    dict(name_ar=HEN, name_en='The Hen', role_en='his wife, sure he is a ghost', icon='house.fill'),
    dict(name_ar=PEACOCK, name_en='The Peacock', role_en='one of the four — has any feather gone missing?', icon='sparkles'),
    dict(name_ar=PEAHEN, name_en='The Peahen', role_en='counts his feathers, again', icon='number'),
    dict(name_ar=CROW, name_en='The Crow', role_en='one of the four — asks for a drink of water', icon='bird'),
    dict(name_ar=NARR, name_en='Narrator', role_en='recites the āyah', icon='book.closed.fill'),
]


def L(speaker, ar, en, note=None):
    d = dict(speaker=speaker, ar=ar, en=en)
    if note: d['note'] = note
    return d


def caption(heard, read):
    return f'الأصل في التفريغ: «{heard}» — رُجّحت «{read}» اعتماداً على السياق والنحو'


UNNAMED = 'المتكلم لا يُسمّى | the speaker is unnamed'
PREY = 'من الطيور الجارحة | one of the birds of prey'
BIRDS = 'أحد الطيور الأربعة | one of the four birds'
FLOCK = 'حمامة من السرب | a dove of the flock'

SCENES = [
    dict(title_ar='المشهد الأول — أين توقّفنا؟', title_en='Scene 1 — Where We Stopped',
         icon='book.fill', era='present',
         summary_en='Abraham asked to see how God raises the dead — not from doubt, but so his heart could be at rest.',
         lines=[
        L(STORY, 'هيا، هيا، تناولوا طعامكم. تريدون أن أكمل لكم قصّة طير إبراهيم؟ حسناً، أين توقّفنا؟',
          "Come on, come on — eat your food. You want me to finish the story of Abraham's birds? All right — where did we stop?",
          '[يُطعم الحمام | feeding the doves]'),
        L(STORY, 'نعم: ذبح سيدنا إبراهيم أربعة من الطير، ومنهم الحمام. أراد الخليل أن يعرف كيف يحيي الله الموتى، وطلب هذا من ربّه.',
          "Yes: our master Abraham slaughtered four birds, a dove among them. The Friend of God wanted to know how God gives life to the dead, and he asked his Lord for this."),
        L(STORY, 'لم يكن طلبه لنقصٍ في الإيمان، حاشا لله، بل طلب أن يرى بعث الموتى ليطمئنّ قلبه.',
          "It wasn't that his faith was lacking — God forbid! He asked to see the dead raised so that his heart could be at rest.",
          caption('ما عدا الله', 'حاشا لله')),
        L(STORY, 'وجاء أمر الله إلى نبيّه أن يذبح أربعة من الطير ويقسّمهم إلى أجزاء، ثم يجعل على كل جبل جزءاً من الطير الذبيح.',
          "And God's command came to His prophet: slaughter four birds, divide them into parts, then set a part of the slaughtered birds on every mountain."),
    ]),
    dict(title_ar='المشهد الثاني — رثاء ناشا', title_en="Scene 2 — Nāshā's Lament",
         icon='heart.slash.fill', era='past',
         summary_en="She holds his wing and asks what he did wrong — and who would dare move what Abraham set down.",
         lines=[
        L(NASHA, 'هذا جناحه… لن يطير ثانيةً.', "This is his wing… it will never fly again."),
        L(NASHA, 'ماذا فعلت يا حبيبي ليذبحك الحليم الطيب، سيدنا إبراهيم؟ إنك لم تؤذِ ضعيفاً، ولم تكن يوماً من الطيور الجوارح.',
          "What did you do, my love, for the gentle, kind one — our master Abraham — to slaughter you? You never hurt anything weak; you were never a bird of prey.",
          caption('لم تؤدي', 'لم تؤذِ')),
        L(NASHA, 'أيكون حبّك لي ذنباً تُعاقَب عليه؟ ولكن الحب جعلك دائم التسبيح والشكر لله. أيكون ذبحك عقاباً لي أنا؟ ألهذا الحدّ يغضب عليّ سيدنا إبراهيم؟ لماذا؟',
          "Was your love for me a sin you're being punished for? But love only made you glorify and thank God all the more. Is your slaughter a punishment for me? Is our master Abraham so angry with me? Why?",
          caption('يكون حبك … للهكون … أنا الحد', 'أيكون حبّك … لله. أيكون … ألهذا الحدّ')),
        L(NASHA, 'كم وضعت رأسي على هذا الصدر الحنون!', 'How many times I laid my head on this tender breast!'),
        L(NASHA, 'لو أن سيدنا إبراهيم ذبحك لإطعام الضيوف لكان شرفاً نباهي به، ولكنه يلقي بأجزاء جسمك على قمم الجبال لتأكلها النسور والطيور الجارحة.',
          "If our master Abraham had slaughtered you to feed his guests, it would have been an honour to boast of. But he's throwing the pieces of your body onto the mountaintops, for the eagles and the birds of prey to eat.",
          caption('النصور', 'النسور')),
        L(NASHA, 'لكم وددت أن أجمع أشلاءك وأجعلك ترتاح في التراب… ولكن، ولكن من يجرؤ على نقل شيء وضعه سيدنا إبراهيم بيده الكريمة؟',
          'How I wish I could gather up your remains and lay you to rest in the earth… but — but who would dare move something our master Abraham put down with his own noble hand?',
          caption('لكن ودت', 'لكم وددت')),
    ]),
    dict(title_ar='المشهد الثالث — الجوارح', title_en='Scene 3 — The Birds of Prey',
         icon='mountain.2.fill', era='past',
         summary_en="Four fresh birds on the peaks, and the eagles are starving — yet none of them can go near.",
         lines=[
        L(None, 'هل تعرفون أن هناك وجبةً قيّمة من الطير المذبوح على قمم الجبال البعيدة؟', "Do you know there's a fine meal of slaughtered birds up on the far mountaintops?",
          caption('ود قيمه', 'وجبةً قيّمة') + ' — قراءة غير قاطعة | an uncertain reading · ' + PREY),
        L(None, 'نعم، هذه طيور سيدنا إبراهيم عليه السلام، فمن يجرؤ على الاقتراب منها؟', "Yes — those are our master Abraham's birds. Who would dare go near them?", PREY),
        L(None, 'ولكنها ذبيحة، هو الذي ذبحها.', 'But they are slaughtered — he slaughtered them himself.', PREY),
        L(None, 'لا أستطيع. رغم أنني جائع، أتضوّر جوعاً، وأربعة من الطيور الطازجة على قمم الجبال تناديني، ولكن شيئاً بداخلي يمنعني أن أقترب منها، وكأنني مأمور أن أتركها في مكانها.',
          "I can't. Even though I'm hungry — starving — and four fresh birds on the mountaintops are calling to me, something inside me stops me going near them, as if I'd been ordered to leave them where they are.",
          caption('اتدور جوعا', 'أتضوّر جوعاً') + ' · ' + PREY),
        L(None, 'هذا هو إحساسنا جميعاً، فالزم الصمت، ولا تعُد لذكر الطيور الذبيحة.', "That's what all of us feel. So hold your tongue, and don't mention the slaughtered birds again.", PREY),
    ]),
    dict(title_ar='المشهد الرابع — عند النهر', title_en='Scene 4 — By the River',
         icon='water.waves', era='past',
         summary_en='The flock goes looking for Nāshā. She sits by the river, remembering the day he named her.',
         lines=[
        L(None, 'هذا أمر الله؛ كل طير وكل حيوان وكل إنسان سيموت عندما يحين أجله.', 'This is the will of God. Every bird, every animal and every human being will die when their time comes.',
          caption('يعين أجله', 'يحين أجله') + ' · ' + FLOCK),
        L(None, 'نعم، ولكن الفراق مؤلم.', 'Yes — but parting hurts.', FLOCK),
        L(None, 'أين ناشا؟ لماذا لم تأتِ إلى جلستنا؟', "Where's Nāshā? Why hasn't she come to join us?", FLOCK),
        L(None, 'لعلّها ترقد على بيضها. مسكينة، هي أكثرنا تألّماً.', "Maybe she's sitting on her eggs. Poor thing — she's hurting more than any of us.",
          caption('ترق قض', 'ترقد') + ' · ' + FLOCK),
        L(None, 'أليس من الواجب أن نسأل عنها؟ لعلّها تحتاج إلى بعض الحبوب أو الماء، أو حتى كلمات المواساة. هيا بنا.',
          "Shouldn't we go and see how she is? She may need some grain or water — or just a few words of comfort. Let's go.",
          caption('ان تسال', 'أن نسأل') + ' · ' + FLOCK),
        L(None, 'إنها غير موجودة! أين ذهبت؟', "She isn't here! Where has she gone?", FLOCK),
        L(None, 'أعرف مكانها: إنها عند النهر، تجلس صامتة، ناظرة إلى صفحة الماء.', 'I know where she is: by the river, sitting in silence, staring at the surface of the water.', FLOCK),
        L(JANAH, 'هل أنتِ بخير؟', 'Are you all right?', '[ذكرى من الجزء الأول | a memory, from part 1]'),
        L(NASHA, 'إنني بخير يا سيدي القائد. كيف أكون في مهارتك وسرعتك في الطيران؟', "I'm fine, commander. How can I fly as skilfully and as fast as you?"),
        L(JANAH, 'بالحب… سأسمّيكِ ناشا.', "By love… I'll call you Nāshā."),
        L(NASHA, 'ناشا؟', 'Nāshā?'),
        L(JANAH, 'عندما نحبّ نولد من جديد، وبما أننا قد وُلدنا الآن، فنحن نحتاج إلى أسماء جديدة.', "When we love, we're born again — and since we have just been born, we need new names."),
        L(NASHA, 'الريح تحمل كلماتك بعيداً فلا أسمعك…', "The wind is carrying your words away — I can't hear you…"),
    ]),
    dict(title_ar='المشهد الخامس — الطيور تعود', title_en='Scene 5 — The Birds Return',
         icon='arrow.uturn.backward.circle.fill', era='past',
         summary_en='Abraham calls the four birds, and they come to him whole — remembering nothing but a dream of a knife.',
         lines=[
        L(STORY, 'أمر الله نبيّه إبراهيم عليه السلام أن يذبح الطير ويفرّق أجزاءه على الجبال، ثم يدعوه إليه، فيستجيب الموتى وتعود إليهم الحياة.',
          "God commanded His prophet Abraham to slaughter the birds and scatter their parts over the mountains, then call them to him — and the dead would answer, and life would come back to them.",
          caption('الطيره', 'الطير')),
        L(STORY, 'رأى خليل الله بعينيه أجسام الطير تتلاحم وتسعى إليه، ولا أثر فيها للذبح. رأى الآية، وبقي سرّ الخلق وسرّ البعث لا يعرفه إلا الله.',
          "The Friend of God saw with his own eyes the birds' bodies knit together and come hurrying to him, with no mark of the slaughter on them. He saw the sign — and the secret of creation, the secret of the rising, stayed known to God alone."),
        L(None, 'ماذا حدث لنا؟', 'What happened to us?', BIRDS),
        L(None, 'لا شيء. دعانا السيد الكريم إليه فذهبنا، ولمسنا بيده الحانية، وهو مشغول بالتسبيح وذكر الله كعادته.',
          'Nothing. The noble master called us to him and we went, and he stroked us with his gentle hand, busy as ever glorifying and remembering God.', BIRDS),
        L(None, 'لا، بل أقصد قبل ذلك.', 'No — I mean before that.', BIRDS),
        L(None, 'ماذا؟ ماذا تعني؟', 'What? What do you mean?', BIRDS),
        L(None, 'خُيّل لي أن سيدنا إبراهيم كان يحمل في يده سكيناً، وربما ذبحنا.', 'I had the feeling our master Abraham was holding a knife in his hand — and maybe he slaughtered us.', BIRDS),
        L(None, 'ما هذا التخريف؟ كيف يذبحنا ونحن أمامك نطير ونرفرف؟', 'What nonsense is this? How could he have slaughtered us, when here we are in front of you, flying and flapping?', BIRDS),
        L(JANAH, 'سامحوني يا أصحاب، إن ناشا وحدها في العشّ جائعة، وقد كنت ذاهباً لإحضار الطعام لها.', "Forgive me, friends — Nāshā is alone in the nest and hungry. I was on my way to fetch her food."),
        L(None, 'رأيت السكين، صدّقوني!', 'I saw the knife — believe me!', BIRDS),
        L(None, 'أنا أيضاً حلمت بالسكين. أعتقد أنه كان حلماً… ليلياً.', 'I dreamt of the knife too. I think it was a dream… a night-time dream.',
          caption('حلما ليلا ليلا ليلا', 'حلماً ليلياً') + ' — قراءة غير قاطعة | an uncertain reading · ' + BIRDS),
    ]),
    dict(title_ar='المشهد السادس — حيّ', title_en='Scene 6 — Alive',
         icon='heart.fill', era='past',
         summary_en="He comes home scolding her for leaving the eggs. She thinks she's hearing a dead dove's voice.",
         lines=[
        L(JANAH, 'ناشا حبيبتي، أحضرت إليكِ الطعام! أين… أين ذهبت ناشا؟ ولماذا لا ترقد على البيض؟ ما هذا الإهمال!',
          "Nāshā, my love — I've brought you food! Where… where has Nāshā gone? And why isn't she sitting on the eggs? Such carelessness!",
          caption('البيت', 'البيض')),
        L(JANAH, 'سأعاقبها على تقصيرها في حقّ أولادي، وأؤدّبها إذا لزم الأمر. أعرف أين أجدها.', "I'll punish her for neglecting my children — and discipline her if I must. I know where to find her."),
        L(JANAH, 'ناشا، لماذا تقفين هنا وحدك؟ هل أنتِ مريضة؟ أجيبيني!', "Nāshā, why are you standing here all alone? Are you ill? Answer me!", caption('ماشا', 'ناشا')),
        L(NASHA, 'ارحمني يا ربّي…', 'Have mercy on me, my Lord…'),
        L(JANAH, 'لماذا لا تنظرين إليّ؟', "Why won't you look at me?"),
        L(NASHA, 'عقلي يهتزّ؛ إنني أسمع صوته كما كان حيّاً.', 'My mind is shaken — I can hear his voice as if he were alive.', caption('يعتز', 'يهتزّ')),
        L(JANAH, 'ناشا، أحوالك لا تعجبني.', "Nāshā, I don't like the state you're in.", caption('هاشا', 'ناشا')),
        L(NASHA, 'من أنت؟', 'Who are you?'),
        L(JANAH, 'ألا تعرفينني؟', "Don't you know me?"),
        L(NASHA, 'كأنك زوجي وحبيبي! يا إلهي، كيف؟ لكنك… لكن ماذا؟ أنت ميت! كيف عدت من الموت يا حبيبي؟ يا إلهي، كيف؟',
          "You look like my husband, my love! My God — how? But you're… but what? You're dead! How have you come back from death, my love? My God — how?"),
        L(JANAH, 'اهدئي يا ناشا، أنتِ متعبة من قلّة النوم، وتحتاجين إلى الراحة.', "Calm down, Nāshā. You're tired from lack of sleep — you need rest.", caption('هدائي', 'اهدئي')),
        L(NASHA, 'لقد ذبحك سيدنا إبراهيم أمام عيني! رأيت السكين وهو يغوص في رقبتك.', "Our master Abraham slaughtered you before my eyes! I saw the knife sink into your neck."),
        L(JANAH, 'السكين؟ غريبة… أنا أيضاً رأيت سكيناً. ناشا، حدّثيني بكل شيء.', "The knife? Strange… I saw a knife too. Nāshā, tell me everything."),
        L(NASHA, 'ذبحك سيدنا إبراهيم أمامي، وجعلك قطعاً مع ثلاثة طيور أخرى، وفرّق أجزاءك على الجبال.',
          'Our master Abraham slaughtered you in front of me. He cut you into pieces with three other birds, and scattered your parts over the mountains.',
          caption('وفرغ', 'وفرّق')),
        L(JANAH, 'لم يذبحني سيدنا إبراهيم؛ لقد دعاني إليه فجئت ساعياً.', "Our master Abraham didn't slaughter me. He called me to him — and I came hurrying.",
          "صدى لقوله تعالى: ﴿ثُمَّ ادْعُهُنَّ يَأْتِينَكَ سَعْيًا﴾ البقرة ٢:٢٦٠ | echoes Qur'an 2:260"),
        L(NASHA, 'بل ذبحك أمام عيني يا حبيبي!', 'But he slaughtered you before my eyes, my love!'),
        L(JANAH, 'لكنّني حيّ يا ناشا!', "But I'm alive, Nāshā!", caption('نهش', 'ناشا')),
        L(NASHA, 'أنا لا أصدّق أنك حيّ! آه يا حبيبي… آه!', "I can't believe you're alive! Oh, my love… oh!"),
    ]),
    dict(title_ar='المشهد السابع — العفريت', title_en='Scene 7 — The Ghost',
         icon='exclamationmark.bubble.fill', era='past',
         summary_en='The rooster comes home. His hen and chicks scream — they know he died.',
         lines=[
        L(ROOSTER, 'ما هذا؟ هل ترون وحشاً أمامكم، أم ثعلباً ينوي أن يقطف رؤوسكم؟ ها؟', "What's this? Do you think you're looking at a monster — or a fox come to bite your heads off? Huh?",
          caption('ينوي يفت راسكم', 'ينوي أن يقطف رؤوسكم')),
        L(HEN, 'انصرف! انصرف! لا تؤذِنا ولن نؤذيك!', "Go away! Go away! Leave us alone and we won't hurt you!"),
        L(ROOSTER, 'ها! هل هذا أسلوب تتحدث به دجاجة مهذّبة مع زوجها الغائب، وأمام الكتاكيت الصغار؟ كوكو، كوكو!',
          "Ha! Is that any way for a well-mannered hen to talk to her husband who's been away — and in front of the little chicks? Cock-a-doodle-doo!",
          'بعد «الصغار» كلمة غير واضحة: «يا المهجله» | after «little chicks», an unclear word'),
        L(HEN, 'العفو، العفو والسماح أيها العفريت!', "Mercy — mercy and forgiveness, O ghost!"),
        L(ROOSTER, 'عفريت؟ حسناً، سأريكم ماذا سيفعل بكم العفريت!', "A ghost? Very well — I'll show you what the ghost will do to you!"),
    ]),
    dict(title_ar='المشهد الثامن — ألفا ريشة', title_en='Scene 8 — Two Thousand Feathers',
         icon='sparkles', era='past',
         summary_en='The peacock has died and risen — and all he wants to know is whether any feather is missing.',
         lines=[
        L(PEAHEN, '…ألفٌ وتسعمئة وتسعة وثمانون… ألفان! إن الريش كله سليم، لم تنقص ريشة واحدة. حمداً لله على سلامته.',
          "…one thousand nine hundred and eighty-nine… two thousand! Every feather is sound — not one is missing. Thank God he's safe.",
          'الأرقام في التفريغ: «1989 200» | the captions give the numbers as digits'),
        L(PEACOCK, 'أعتقد أنكِ أخطأتِ في العدّ.', 'I think you miscounted.'),
        L(PEAHEN, 'لم أخطئ!', "I did not!"),
        L(PEACOCK, 'آه، لا ضرر من المراجعة للمرة العاشرة يا زوجتي. أنتِ تعرفين أهمية الريش بالنسبة لي.', "Ah — there's no harm in checking a tenth time, my dear. You know how much my feathers mean to me."),
        L(PEAHEN, 'لماذا أعادك سيدنا إبراهيم؟', 'Why did our master Abraham bring you back?'),
        L(PEACOCK, 'هل تقولين شيئاً؟ عُدّي الريش!', 'Did you say something? Count the feathers!'),
        L(PEAHEN, 'واحدة، اثنتان، ثلاث…', 'One, two, three…'),
    ]),
    dict(title_ar='المشهد التاسع — معشر الغربان', title_en='Scene 9 — The Nation of Crows',
         icon='bird', era='past',
         summary_en="Crows first again: they taught Cain to bury his brother, and now one of them has come back from death.",
         lines=[
        L(None, 'إن تجربة الموت والعودة للحياة مرة أخرى هي تجربة فريدة من نوعها أيها الرفاق.', "Dying and coming back to life again is a one-of-a-kind experience, comrades.",
          'غرابٌ من الرفاق | a crow of his company'),
        L(CROW, 'هذا إن كنتم على يقين أنني ذُبحت بالفعل.', "That's if you're sure I was really slaughtered."),
        L(None, 'وهو شرف يضاف إلى أمجادنا نحن معشر الغربان. لا تنسوا أن أحد أجدادكم علّم ابن آدم قابيل كيف يواري سوءة أخيه وكيف يدفنه، وها نحن نسبق البشر مرة أخرى في تجربة البعث بعد الموت.',
          "And it's an honour to add to the glories of us crows. Don't forget that one of your forefathers taught Adam's son Qābīl how to cover his brother's body and bury him — and here we are, ahead of mankind once again, in rising after death.",
          'صدى لقصة «غراب ابني آدم» | recalls «The Raven of Adam\'s Sons»'),
        L(CROW, 'شكراً. أريد جرعة ماء… جرعة ماء!', 'Thank you. I need a drink of water… a drink of water!', caption('جرى ماء', 'جرعة ماء')),
        L(CROW, 'آه، الصورة بدأت تتّضح: أمسك سيدنا إبراهيم أربعة من الطير، كنت أنا واحداً منهم، وذبحنا، ثم دعانا إليه، فإذا بنا ننهض من الموت ونلبّي النداء.',
          'Ah — the picture is getting clearer. Our master Abraham took four birds — I was one of them — and slaughtered us. Then he called us to him, and we rose up from death and answered the call.'),
        L(None, 'ولكن كيف؟', 'But how?'),
        L(CROW, 'لا أحد يدري، ولا حتى سيدنا إبراهيم. لقد قال نبيّ الله: «ربِّ أرني كيف تحيي الموتى.» ربما كان يريد أن يرى يد القدرة الخالقة وهي تعمل، ولكنه لم يرَ غير النتيجة؛ أمّا مسألة الخلق نفسها فهي سرّ لا يعلمه إلا الله.',
          "No one knows — not even our master Abraham. God's prophet said: 'My Lord, show me how You give life to the dead.' Perhaps he wanted to see the creating hand at work — but he saw only the result. The act of creation itself is a secret known only to God.",
          caption('ربي ارني تحيي', 'ربِّ أرني كيف تحيي')),
    ]),
    dict(title_ar='المشهد العاشر — ما الحكمة؟', title_en='Scene 10 — What Was the Wisdom?',
         icon='questionmark.circle.fill', era='past',
         summary_en="If Abraham himself did not learn how, how could a dove? Nāshā knows what was gained.",
         lines=[
        L(JANAH, 'إذا كان خليل الله عليه الصلاة والسلام لم يعرف كيف عدت أنا من الموت، فكيف لي أن أعرف؟ ولكن ما هي الحكمة في موتي وعودتي للحياة؟',
          "If the Friend of God himself, peace be upon him, didn't learn how I came back from death — how could I know? But what was the wisdom in my dying and coming back to life?"),
        L(NASHA, 'لقد أعادك الله إليّ، وأعادني إليك، وأعاد إلى سيدنا إبراهيم قلبه المطمئن. ماذا تريد أكثر من ذلك؟',
          "God gave you back to me, and me back to you — and gave our master Abraham back his heart at rest. What more could you want?"),
        L(JANAH, 'كم يحبّ الله نبيّه إبراهيم!', 'How God loves His prophet Abraham!'),
    ]),
    dict(title_ar='المشهد الحادي عشر — خليل الله', title_en='Scene 11 — The Friend of God',
         icon='moon.stars.fill', era='present',
         summary_en="The āyah itself — and why every one of Abraham's miracles came from love.",
         lines=[
        L(NARR, 'وَإِذْ قَالَ إِبْرَاهِيمُ رَبِّ أَرِنِي كَيْفَ تُحْيِي الْمَوْتَىٰ ۖ قَالَ أَوَلَمْ تُؤْمِن ۖ قَالَ بَلَىٰ وَلَٰكِن لِّيَطْمَئِنَّ قَلْبِي ۖ قَالَ فَخُذْ أَرْبَعَةً مِّنَ الطَّيْرِ فَصُرْهُنَّ إِلَيْكَ ثُمَّ اجْعَلْ عَلَىٰ كُلِّ جَبَلٍ مِّنْهُنَّ جُزْءًا ثُمَّ ادْعُهُنَّ يَأْتِينَكَ سَعْيًا ۚ وَاعْلَمْ أَنَّ اللَّهَ عَزِيزٌ حَكِيمٌ',
          "And when Abraham said, 'My Lord, show me how You give life to the dead,' He said, 'Do you not believe?' He said, 'Yes — but so that my heart may be at rest.' He said, 'Then take four birds and draw them to you; then set a part of them on every mountain; then call them — they will come to you in haste. And know that God is Mighty, Wise.'",
          "آية قرآنية — سورة البقرة ٢:٢٦٠ | Qur'an 2:260"),
        L(NARR, 'صدق الله العظيم.', 'God Almighty has spoken the truth.'),
        L(STORY, 'كان سيدنا إبراهيم هو العبد الربّاني الذي استحقّ أن يتّخذه الله خليلاً. تلك درجة من درجات الأنبياء لا نعرف مقدارها، ولا أعرف كيف أصفها، وأعتقد أن أيّ كلمات تقال عنها لن تكفي لوصفها.',
          "Our master Abraham was the devoted servant who was worthy to be taken by God as His Friend. That is a rank among the prophets whose height we cannot measure. I don't know how to describe it — and I think no words said about it would be enough."),
        L(STORY, 'أحبّ إبراهيمُ اللهَ، فألقاه قومه في النار بسبب إيمانه، لكنه لم يعترض ولم يقاوم. ورأى في المنام أنه يذبح ابنه إسماعيل، فقرّر أن يذبحه بالفعل، وأنزل الله من السماء كبشاً عظيماً يفدي به ولده.',
          "Abraham loved God, and his people threw him into the fire for his faith — yet he did not protest or resist. He saw in a dream that he was sacrificing his son Ishmael, and he resolved to do it in truth — and God sent down a great ram from heaven to ransom his son."),
        L(STORY, 'وأحبّ الله نبيّه إبراهيم، فأمر النار أن تكون برداً وسلاماً على جسده. وعندما أراد قلب الخليل أن يطمئنّ، منحه الله القدرة على أن يدعو الطير الممزّق من موته، فيُسرع ملتئماً ساعياً إليه.',
          "And God loved His prophet Abraham: He commanded the fire to be coolness and safety on his body. And when the heart of His Friend wished for rest, God gave him the power to call the torn birds out of their death — and they came back whole, hurrying to him.",
          caption('الطير ممزق من موتك', 'الطير الممزّق من موته')),
        L(STORY, 'إنها قدرة الحب؛ الحب الذي من أجله جاءت كل هذه المعجزات.', 'It is the power of love — the love for whose sake all these miracles came.'),
    ]),
]

for i, s in enumerate(SCENES, 1):
    s['scene_no'] = i

NOTES = (
    "Reconstructed from the raw auto-generated YouTube captions (ar_text_unit.text_ar) alone, by reading the "
    "Arabic: its grammar, the sense of the scene, and the Qur'an it echoes — Janāḥ's «فجئت ساعياً» answers "
    "«يأتينك سعياً», and al-Baqara 2:260 is recited in full from the muṣḥaf. The four birds are the dove, the "
    "rooster, the peacock and the crow, each seen coming home. The archive's machine English was not used. Each "
    "repaired caption word is flagged in its line's note with what the captions heard; uncertain readings are "
    "marked as such. Speakers are named where the dialogue makes them plain and left unnamed where it does not. "
    "The English is a fresh translation of the reconstructed Arabic, written as script.")

DOC = dict(
    title_ar='طير إبراهيم - ج 2',
    title_en="Abraham's Birds — Episode 6 (Part 2)",
    series_ar='قصص الحيوان في القرآن', series_en="Animal Stories from the Qur'an", episode=6,
    video_url='https://www.youtube.com/watch?v=ux92Uvhkp50',
    acq_ref_id='ACQ:YT:ux92Uvhkp50', source_text_unit_id=UNIT,
    reconstruction_notes=NOTES,
    cast=CAST,
    scenes=[{k: s[k] for k in ('scene_no', 'title_ar', 'title_en', 'icon', 'era', 'summary_en', 'lines')} for s in SCENES],
)

if __name__ == '__main__':
    j = json.dumps(DOC, ensure_ascii=False, separators=(',', ':')).replace("'", "''")
    print(f"UPDATE ar_text_unit SET script_json = '{j}' WHERE id = '{UNIT}';")
