# -*- coding: utf-8 -*-
"""The script of «غراب ابني آدم — ج 2» (Animal Stories from the Qur'an, ep. 2),
reconstructed from the raw YouTube auto-captions in ar_text_unit.text_ar and
checked sentence by sentence against the archive's English
(meta_json.translation_en), as part 1 and the Namla episode were.

    python3 scripts/episodes/apply.py ghurab_ep2
"""
import json

UNIT = 'ARTX:YT-0tvHdjWTGWs:1'

CROW, SHEP, CAIN, ABEL, WIFE = 'الغراب', 'الراعي', 'قابيل', 'هابيل', 'زوجة هابيل'
GHAR, JAAB, ZAAQ, NARR = 'غربو', 'جعبوب', 'زعقان', 'راوٍ'

CAST = [
    dict(name_ar=CROW, name_en='The Crow', role_en='tells the story, in the present', icon='bird.fill'),
    dict(name_ar=SHEP, name_en='The Shepherd', role_en='Ṣādiq — who came to listen', icon='figure.stand'),
    dict(name_ar=CAIN, name_en='Qābīl (Cain)', role_en="Adam's elder son", icon='flame.fill'),
    dict(name_ar=ABEL, name_en='Hābīl (Abel)', role_en="Adam's younger son", icon='heart.fill'),
    dict(name_ar=GHAR, name_en='Gharbū', role_en='the young crow who becomes judge', icon='scalemass.fill'),
    dict(name_ar=JAAB, name_en='Jaʿbūb', role_en='his brother — the crows\' singer', icon='music.note'),
    dict(name_ar=WIFE, name_en="Hābīl's wife", role_en='a mother, left to raise his son', icon='person.fill'),
    dict(name_ar=ZAAQ, name_en='Zaʿqān', role_en='a crow who takes what is not his', icon='exclamationmark.octagon.fill'),
    dict(name_ar=NARR, name_en='Narrator', role_en='recites the āyāt', icon='book.closed.fill'),
]


def L(speaker, ar, en, note=None):
    d = dict(speaker=speaker, ar=ar, en=en)
    if note: d['note'] = note
    return d


def caption(heard, read):
    return f'الأصل في التفريغ: «{heard}» — رُجّحت «{read}» اعتماداً على السياق والنحو'


def ayah(n):
    return f"آية قرآنية — سورة المائدة ٥:{'٢٨ ٢٩ ٣٠ ٣١'.split()[n - 28]} | Qur'an 5:{n}"


UNNAMED = 'المتكلم لا يُسمّى | the speaker is unnamed'

SCENES = [
    dict(title_ar='المشهد الأول — تحت الشجرة', title_en='Scene 1 — Under the Tree',
         icon='bird', era='present',
         summary_en='The crow takes up the story again where the offering left it — with a threat.',
         lines=[
        L(CROW, 'هل عرفت الآن أيها الراعي سرّ غضبي من الناس؟', 'Do you see now, shepherd, why I am so angry with people?'),
        L(CROW, 'يقول الناس عن الأيام الصعبة التي تمرّ بهم: كانت أياماً أسود من ريش الغراب.',
          "When people speak of the hard days they live through, they say: those days were blacker than a raven's feathers."),
        L(CROW, 'أعرف أن لون الغراب الأسود يثير ضيق الناس، رغم أن أعظم الريش سواداً في جسم الغراب لا يقارب سواد قلب الإنسان إذا اسودّ قلبه.',
          "I know a raven's black troubles people — yet the blackest feather on a raven comes nowhere near the black of a man's heart, once his heart turns black."),
        L(CROW, 'وأعرف أن الناس يسخرون من مشية الغراب. لنفترض أن مشيتنا غريبة، ليكن! إننا نقفز ونحجل؛ أليس هذا أمراً طبيعياً بعدما رأيناه من ظلم الإنسان لأخيه الإنسان؟',
          "And I know people mock the way a raven walks. Say our walk is odd — so be it! We hop and we skip. Isn't that only natural, after the wrong we've watched man do to his brother?",
          caption('نفترض', 'لنفترض')),
        L(SHEP, 'اهدأ يا صديقي، وأكمل الحكاية.', 'Easy, my friend — and go on with the story.'),
        L(CROW, 'لقد نسيتُ أين توقفنا.', "I've forgotten where we stopped."),
        L(SHEP, 'عندما كبر قابيل وهابيل قرّر أبوهما آدم عليه السلام أن يزوّجهما.', 'When Qābīl and Hābīl grew up, their father Adam, peace be upon him, decided to marry them.'),
        L(CROW, 'نعم، نعم، تذكرت! لكن قابيل عارض الأمر وأراد أن يتزوج عروس هابيل، واقترح الأب أن يقدّم كلٌّ منهما قرباناً إلى السماء.',
          "Yes, yes — I remember! But Qābīl set himself against it and wanted Hābīl's bride, so their father proposed that each bring an offering to heaven."),
        L(SHEP, 'وماذا قدّم كلٌّ منهما؟', 'And what did each of them bring?'),
        L(CROW, 'قدّم قابيل البخيل أعواد قمح جافة، وقدّم هابيل الطيب أسمن كباشه. ونزلت نار من السماء أكلت قربان هابيل، وأعلنت قبول الهدية.',
          "Mean Qābīl brought dry stalks of wheat; good Hābīl brought the fattest of his rams. Fire came down from the sky, consumed Hābīl's offering, and so declared the gift accepted."),
        L(SHEP, 'وماذا حدث بعدها؟', 'And what happened then?'),
        L(CROW, 'صرخ هابيل صرخة الحمد والفرح، وصرخ قابيل بكلمة القتل.', 'Hābīl cried out in praise and joy — and Qābīl cried out one word: murder.'),
    ]),
    dict(title_ar='المشهد الثاني — الوعيد', title_en='Scene 2 — The Threat',
         icon='exclamationmark.triangle.fill', era='past',
         summary_en='Qābīl swears to kill his brother; Hābīl will not raise his hand.',
         lines=[
        L(CAIN, 'سأقتلك!', "I'll kill you!"),
        L(ABEL, 'لا تغضب يا قابيل، إنما يتقبّل الله عمل المتقين. لو ندمت الآن وعدت إلى الله فسوف يتقبّل منك.',
          "Don't be angry, Qābīl. God accepts the deeds of those who fear Him. If you repent now and turn back to God, He will accept it from you."),
        L(CAIN, 'سأقتلك ذات يوم، وثق أنني فاعل.', "One day I'll kill you — and rest assured, I will."),
        L(ABEL, 'لن أقاومك إذا حاولت قتلي؛ سأتركك تحمل الذنب وحدك وتكون من أصحاب النار. هذا هو جزاء الظلم.',
          "I won't fight you if you try to kill me. I'll leave you to carry the sin alone, and be among the people of the Fire. That is the wage of wrongdoing.",
          'صدى لسورة المائدة ٥:٢٨–٢٩ | echoes Qur\'an 5:28–29'),
    ]),
    dict(title_ar='المشهد الثالث — امتحان القضاء', title_en="Scene 3 — The Judge's Examination",
         icon='scalemass.fill', era='past',
         summary_en="Gharbū answers the last question — and becomes judge of the crows.",
         lines=[
        L(None, 'السؤال الأخير في امتحان القضاء: ما هو حكم الغراب الذي يخطف أنثى غراب آخر؟',
          "The last question of the judge's examination: what is the sentence for a crow who steals another crow's mate?",
          'الممتحِن لا يُسمّى | the examiner is unnamed'),
        L(GHAR, 'السؤال صعب وتعجيز! نحن الغربان لا نتزوج إلا بأنثى واحدة.', "That's a hard question — a trick! We crows only ever take one mate."),
        L(None, 'نعم، هذا صحيح. والآن يا غربو، حان وقت الإجابة.', "Yes, that's true. And now, Gharbū — it's time for your answer."),
        L(GHAR, 'إن جريمة خطف الأنثى عقوبتها القتل ضرباً بالمناقير، للأسف.', 'The crime of stealing a mate is punished by death — pecked to death by beaks. Sadly.'),
        L(None, 'الإجابة صحيحة.', 'The answer is correct.'),
        L(CROW, 'وهكذا أُعلِن غربو قاضياً جديداً لأمّة الغربان.', 'And so Gharbū was proclaimed the new judge of the nation of crows.'),
        L(JAAB, 'أخي القاضي، إنها أسعد لحظة في حياتي! وبهذه المناسبة السعيدة سأغني لكم أغنية جديدة:', "My brother the judge — this is the happiest moment of my life! And for this happy occasion, I'll sing you all a new song:"),
        L(JAAB, 'قاقو قاقو، احترموا القاضي وأطيعوا، وإذا نصحكم فاشكروا، قاقو قاقو!', 'Caw-caw, caw-caw! Respect the judge and do as he says — and when he advises you, say thank you! Caw-caw, caw-caw!', '[يغنّي | sings]'),
    ]),
    dict(title_ar='المشهد الرابع — قبل الولادة', title_en='Scene 4 — Before the Birth',
         icon='heart.circle.fill', era='past',
         summary_en='Hābīl sends his wife to Eve to await their child; she is afraid to leave him.',
         lines=[
        L(None, 'أين ذهب الجميع؟', 'Where did everyone go?', UNNAMED),
        L(ABEL, 'يجب أن تستريحي قبل الولادة. أقترح أن تذهبي لأمّنا حواء حتى تكوني في رعايتها.', 'You must rest before the birth. Go to our mother Eve, I think, so she can look after you.'),
        L(WIFE, 'ولكني أخاف أن أتركك، خاصة وقابيل يتوعّد بالقتل.', "But I'm afraid to leave you — with Qābīl threatening to kill."),
        L(ABEL, 'قابيل أخي. صحيح أنه سريع الغضب وعنيف، ولكن لا أظنه أبداً يقتل أخاه.', "Qābīl is my brother. He's quick to anger and violent, it's true — but I don't believe he would ever kill his brother."),
    ]),
    dict(title_ar='المشهد الخامس — القضية الأولى', title_en='Scene 5 — The First Case',
         icon='building.columns.fill', era='past',
         summary_en="Judge Gharbū's first trial: a stolen nest.",
         lines=[
        L(None, 'القضية الأولى: سرقة العش. نادِ على المتهم!', 'The first case: the stolen nest. Call the accused!', caption('سارقه العش', 'سرقة العش')),
        L(None, 'الغراب زعقان!', 'The crow Zaʿqān!'),
        L(ZAAQ, 'بريء، بريء يا حضرة القاضي!', 'Innocent, innocent, your honour!'),
        L(GHAR, 'انتظر حتى أوجّه لك الاتهام. هل طردت جارك من عشّه وسكنت فيه؟', "Wait until I've charged you. Did you drive your neighbour out of his nest and move in yourself?"),
        L(ZAAQ, 'لقد… لقد كان الجو شديد الحرارة، وأردت أن أحتمي من الشمس.', 'It… it was terribly hot, and I wanted some shelter from the sun.'),
        L(GHAR, 'إذاً تعترف أن العش ملكه هو، وأنت سرقته منه؟', "So you admit the nest is his, and you stole it from him?"),
        L(ZAAQ, 'أنا… أنا أعترف يا حضرة القاضي.', 'I… I confess, your honour.'),
        L(GHAR, 'يُلزَم زعقان ببناء عشّ جديد لجاره، ويُهدم العش الذي سرقه.', 'Zaʿqān is bound to build his neighbour a new nest, and the nest he stole shall be pulled down.'),
        L(None, 'يحيا العدل! يحيا العدل! يحيا العدل!', 'Long live justice! Long live justice! Long live justice!', '[أكثر من صوت | several voices]'),
    ]),
    dict(title_ar='المشهد السادس — جريمة زعقان', title_en="Scene 6 — Zaʿqān's Crime",
         icon='exclamationmark.octagon.fill', era='past',
         summary_en='Zaʿqān steals a mate; the judge must pass the sentence he gave in his examination.',
         lines=[
        L(None, 'استيقظ يا غربو، حدثت جريمة خطيرة!', 'Wake up, Gharbū — a terrible crime has happened!', UNNAMED),
        L(GHAR, 'نفّذ قابيل تهديده؟', 'Has Qābīl carried out his threat?'),
        L(None, 'أيّ تهديد؟ أتحدث عن جريمة زعقان.', "What threat? I'm talking about Zaʿqān's crime."),
        L(GHAR, 'زعقان؟ عاد إلى سرقة أعشاش الطيور؟', "Zaʿqān? He's back to stealing birds' nests?"),
        L(None, 'هذه المرة خطف زوجة جاره، وأراد أن يتزوجها بالقوة.', "This time he's taken his neighbour's mate, and meant to have her by force.", caption('ت خاطف', 'خطف')),
        L(GHAR, 'هل جُنّ زعقان؟ ألا يعرف أنها جريمة عقابها الموت؟ وأين هو الآن؟', "Has Zaʿqān lost his mind? Doesn't he know that crime is punished by death? Where is he now?"),
        L(None, 'لا أحد يعرف مكانه؛ هرب وترك ضحيته تبكي بجوار النهر.', 'No one knows. He fled, and left his victim weeping by the river.'),
        L(GHAR, 'نعم، هذا من كنت أبحث عنه. لقد خرقت قانون الفطرة، وخالفت طبيعة أمّة الغربان. ما هو دفاعك؟ تكلّم!',
          "Yes — the one I was looking for. You have broken the law of our nature, and gone against the way of the crows. What is your defence? Speak!",
          caption('هذا ما كنت ابحث عن قد خرقت', 'هذا من كنت أبحث عنه. لقد خرقت')),
        L(ZAAQ, 'لا أجد ما أقوله.', 'I have nothing to say.'),
        L(GHAR, 'هل تعترف بالذنب؟', 'Do you confess your guilt?'),
        L(ZAAQ, 'نعم، أعترف.', 'Yes. I confess.'),
        L(GHAR, 'إن من يعتدي على حقوق غيره من الغربان ويخطف زوجته يُقتل ضرباً بالمناقير. هذا هو الحكم.',
          "Whoever violates another crow's rights and steals his mate shall be pecked to death. That is the sentence.",
          caption('بالمناقير الحكم', 'بالمناقير. هذا هو الحكم')),
        L(JAAB, 'ألن تشهد تنفيذ الحكم؟', "Won't you stay to see it carried out?",
          caption('الن تشهد', 'ألن تشهد')),
        L(GHAR, 'لا، أحتاج إلى الطيران وحدي قليلاً. عندما ينتهون من المهمة سأعود لدفنه.', "No. I need to fly alone for a while. When they've finished, I'll come back to bury him."),
        L(JAAB, 'هل ستدفنه بنفسك؟', "You'll bury him yourself?"),
        L(GHAR, 'نعم، عليّ أن أفعل ذلك. إن الرحمة والعدالة شقيقتان، ويجب أن تسيرا معاً حتى النهاية.',
          'Yes, I must. Mercy and justice are sisters — they have to walk together, all the way to the end.'),
    ]),
    dict(title_ar='المشهد السابع — القتيل الأول', title_en='Scene 7 — The First to Die',
         icon='drop.fill', era='past',
         summary_en='Qābīl kills his brother. The crows saw it — and cannot judge a man.',
         lines=[
        L(ABEL, 'أخي الحبيب، أعطني يدك لأنهض… أخي، لماذا؟ آه… آه…', 'My dear brother, give me your hand, help me up… Brother — why? Ah… ah…', "[آخر كلمات هابيل | Hābīl's last words]"),
        L(JAAB, 'هل أنت مستعد لدفن الغراب المجرم؟', 'Are you ready to bury the criminal crow?'),
        L(GHAR, 'قابيل قتل هابيل! رأيته بعينيّ.', 'Qābīl has killed Hābīl! I saw it with my own eyes.'),
        L(JAAB, 'نعرف، سمعنا الصيحة.', 'We know. We heard the cry.'),
        L(GHAR, 'يجب محاكمة القاتل!', 'The killer must be tried!'),
        L(JAAB, 'تماسك يا أخي.', 'Steady, brother.'),
        L(GHAR, 'يجب محاكمة القاتل، يجب أن أحاكمه!', 'The killer must be tried — I have to try him!'),
        L(JAAB, 'أنت تعرف أنه لا يحق لنا محاكمة الأجناس الأرقى منا. الإنسان أرقى أجناس الأرض، فكيف نحاكمه نحن الغربان؟',
          'You know we have no right to judge the kinds above us. Man is the highest of all the kinds on earth — how could we crows judge him?'),
        L(GHAR, 'أرقى أجناس الأرض، والأخ يقتل أخاه؟', "The highest kind on earth — and a brother kills his brother?"),
        L(JAAB, 'إذا كان هذا سؤالاً فأنا لا أعرف الإجابة، ولكن يبدو أن الأمر يحدث أحياناً؛ على الأقل حدث اليوم أمام عينيك.',
          "If that's a question, I don't know the answer. But it seems it happens, sometimes — it happened today, at least, before your eyes."),
        L(GHAR, 'أريد أن أشهد في القضية، سأكون مجرد شاهد.', "I want to testify in this case. I'll be only a witness."),
        L(JAAB, 'إن الله يسمع ويرى.', 'God hears, and God sees.'),
        L(GHAR, 'نعم، أنت على حق. إذا أفلت قابيل بفعلته في الدنيا فسوف يكون هذا من سوء حظه؛ معناه أن الله يؤجّل له العذاب في الآخرة.',
          "Yes — you're right. If Qābīl escapes what he has done in this world, so much the worse for him: it means God is saving his punishment for the next."),
        L(GHAR, 'سوف يُعاقَب قابيل على كلّ من يرتكب جريمة القتل في تاريخ البشرية، باعتباره أول قاتل، أول من سنّ أبشع الجرائم. هو صاحب ريادة في عالم البشر: أول الأشرار من بني آدم، وأستاذهم ومعلّمهم.',
          "Qābīl will answer for every murder in the history of mankind, as the first killer — the first to lay down the foulest of crimes. He is a pioneer among men: the first villain of the sons of Adam, their master and their teacher."),
        L(JAAB, 'غربو، لا وقت لهذا الكلام. أمامك مهمة، وهي دفن زعقان. احمله في منقارك، وقم بدورك.',
          "Gharbū, there's no time for this. You have a task: to bury Zaʿqān. Carry him in your beak, and do your part."),
    ]),
    dict(title_ar='المشهد الثامن — الغراب يعلّم', title_en='Scene 8 — The Raven Teaches',
         icon='moon.fill', era='past',
         summary_en="Qābīl carries his brother's body and cannot hide it — until he sees a raven dig.",
         lines=[
        L(CAIN, 'آه، تعبت! هل سأحمل هابيل على ظهري طوال العمر؟ كيف أتخلّص من حملي؟ لا… لا…',
          "Ah — I'm worn out! Must I carry Hābīl on my back my whole life? How do I rid myself of this load? No… no…"),
        L(CAIN, 'هل أضعه في كهف؟ ولكن قد يعثر عليه أبي آدم. يا ويلي! كيف سأواجه أبي وأمي حواء؟ آه… سأقول لهما: لا أعرف مكانه، لا أعرف شيئاً.',
          "Put him in a cave? But my father Adam might find him. Woe is me! How will I face my father, and my mother Eve? Ah… I'll tell them: I don't know where he is. I know nothing.",
          caption('كيف ساوا', 'كيف سأواجه')),
        L(CAIN, 'المهم أن أخبّئ جسد هابيل، ولكن أين أضعه؟ في الماء؟ لا، سوف يراه الجميع هنا.',
          "What matters is hiding Hābīl's body — but where? In the water? No — everyone here would see him."),
        L(CAIN, 'آه، لم أعد أقوى على السير. أما زلت تبتسم يا هابيل؟ هل تسخر مني؟',
          "Ah, I can't walk any further. Are you still smiling, Hābīl? Are you mocking me?"),
        L(CAIN, 'نعم، أنت انتصرت عليّ بموتك، انتصرت عليّ بموتك! أعترف بهزيمتي أمامك، حتى وأنت ميت… حتى وأنت ميت! لا، لا، لا!',
          "Yes — you've beaten me by dying, you've beaten me by dying! I admit I've lost to you — even now you're dead… even now you're dead! No, no, no!"),
        L(CAIN, 'هناك صوت… إنه مجرد غراب. ماذا يفعل؟ لماذا يحفر في الأرض؟', "There's a sound… it's only a raven. What is it doing? Why is it digging in the ground?",
          '[غربو يدفن زعقان | Gharbū is burying Zaʿqān]'),
        L(CAIN, 'هذا ما يجب أن أفعله؛ سأقلّد الغراب! ولكن لماذا لم أفكر في هذا الحل البسيط من البداية؟ الغراب يعلّمني أنا؟ هل انحدر بي الحال إلى هذه الدرجة؟ عجزت أن أكون في ذكاء الغربان!',
          "That's what I must do — I'll copy the raven! But why didn't I think of something so simple from the start? A raven, teaching me? Have I sunk this low? I couldn't even be as clever as a raven!",
          caption('ها يجب ان افعله', 'هذا ما يجب أن أفعله')),
    ]),
    dict(title_ar='المشهد التاسع — ابن هابيل', title_en="Scene 9 — Hābīl's Son",
         icon='sun.max.fill', era='past',
         summary_en="A mother sees her husband's smile in her son — then the Qur'an tells the story.",
         lines=[
        L(WIFE, 'يا حبيبي، لك نفس نظرة هابيل، ابتسامته الصافية. أريدك أن تكون مثل والدك في كل شيء.',
          "My darling, you have Hābīl's very look — his clear smile. I want you to be like your father in everything.",
          '[تخاطب ابنها | to her son]'),
        L(WIFE, 'إن أولاد قابيل سيملؤون الأرض بالشرور والفتن، وعليك أن تقف لهم: كلما اقتلعوا شجرة، ازرع ألف شجرة. وارحم الضعفاء والمساكين، وقل كلمة الحق في وجه الأقوياء والظالمين.',
          "Qābīl's children will fill the earth with evil and strife, and you must stand against them: each time they uproot a tree, plant a thousand. Be merciful to the weak and the poor, and speak the truth to the faces of the strong and the unjust."),
        L(WIFE, 'وإياك… إياك أن تفقد هذه الابتسامة الطيبة.', 'And never — never — lose that kind smile.'),
        L(NARR, 'لَئِن بَسَطتَ إِلَيَّ يَدَكَ لِتَقْتُلَنِي مَا أَنَا بِبَاسِطٍ يَدِيَ إِلَيْكَ لِأَقْتُلَكَ ۖ إِنِّي أَخَافُ اللَّهَ رَبَّ الْعَالَمِينَ',
          "'If you stretch out your hand against me to kill me, I will not stretch out mine against you to kill you. I fear God, Lord of the worlds.'", ayah(28)),
        L(NARR, 'إِنِّي أُرِيدُ أَن تَبُوءَ بِإِثْمِي وَإِثْمِكَ فَتَكُونَ مِنْ أَصْحَابِ النَّارِ ۚ وَذَٰلِكَ جَزَاءُ الظَّالِمِينَ',
          "'I would rather you carry my sin and your own, and be among the people of the Fire — that is the reward of those who do wrong.'", ayah(29)),
        L(NARR, 'فَطَوَّعَتْ لَهُ نَفْسُهُ قَتْلَ أَخِيهِ فَقَتَلَهُ فَأَصْبَحَ مِنَ الْخَاسِرِينَ',
          'Then his soul made the killing of his brother seem easy to him, and he killed him — and became one of the losers.', ayah(30)),
        L(NARR, 'فَبَعَثَ اللَّهُ غُرَابًا يَبْحَثُ فِي الْأَرْضِ لِيُرِيَهُ كَيْفَ يُوَارِي سَوْءَةَ أَخِيهِ ۚ قَالَ يَا وَيْلَتَىٰ أَعَجَزْتُ أَنْ أَكُونَ مِثْلَ هَٰذَا الْغُرَابِ فَأُوَارِيَ سَوْءَةَ أَخِي ۖ فَأَصْبَحَ مِنَ النَّادِمِينَ',
          "Then God sent a raven, scratching at the earth, to show him how to cover his brother's body. He said, 'Woe is me! Could I not even be like this raven, and cover my brother's body?' And he became one of the remorseful.", ayah(31)),
        L(NARR, 'صدق الله العظيم.', 'God Almighty has spoken the truth.'),
    ]),
    dict(title_ar='المشهد العاشر — صادق', title_en='Scene 10 — Ṣādiq',
         icon='moon.stars.fill', era='present',
         summary_en='The shepherd understands the crow — and the crow learns his name.',
         lines=[
        L(SHEP, 'الآن أدركت سرّ غضبك من الإنسان، وأدركت أيضاً أن جدّك القديم هو معلّمنا؛ هو أول من علّمنا كيف ندفن موتانا ونترحّم عليهم. أشكرك أيها الغراب الطيب.',
          "Now I understand why you are angry with man. And I understand, too, that your ancient grandfather is our teacher: the first to show us how to bury our dead and pray mercy on them. Thank you, good crow."),
        L(CROW, 'لم أعرف اسمك أيها الراعي.', "I never learned your name, shepherd."),
        L(SHEP, 'اسمي صادق.', 'My name is Ṣādiq.'),
        L(CROW, 'أهلاً بك يا شيخ صادق. سأسمح لك يوماً بأن تقدّم لي الطعام.', "Welcome, Shaykh Ṣādiq. One day I'll allow you to give me some food.", caption('اهلا ب يا شيخ', 'أهلاً بك يا شيخ')),
        L(SHEP, 'هذا كرم منك.', "That's generous of you."),
        L(CROW, 'الآن يجب أن أطير؛ أمامي عمل كثير. أستودعك الله.', "Now I must fly — I've a great deal to do. I leave you in God's keeping."),
        L(SHEP, 'مع السلامة يا صديقي.', 'Go safely, my friend.'),
    ]),
]

for i, s in enumerate(SCENES, 1):
    s['scene_no'] = i

NOTES = (
    "Reconstructed from the raw auto-generated YouTube captions (ar_text_unit.text_ar) alone, by reading the "
    "Arabic: its grammar, the sense of the scene, and — for the four āyāt, al-Māʾida 5:28–31 — the muṣḥaf. The "
    "archive's machine English was not used, for the Arabic or for the translation. Punctuation, hamzas and word "
    "boundaries are restored; each caption word that had to be repaired is flagged in the line's note with what "
    "the captions heard. Speakers are named where the dialogue makes them plain — Jaʿbūb by «تماسك يا أخي», "
    "Hābīl's wife by the birth she is sent to rest for — and left unnamed where it does not. The English is a "
    "fresh translation of the reconstructed Arabic, written as script.")

DOC = dict(
    title_ar='غراب ابني آدم - ج 2',
    title_en="The Raven of Adam's Sons — Episode 2 (Part 2)",
    series_ar='قصص الحيوان في القرآن', series_en="Animal Stories from the Qur'an", episode=2,
    video_url='https://www.youtube.com/watch?v=0tvHdjWTGWs',
    acq_ref_id='ACQ:YT:0tvHdjWTGWs', source_text_unit_id=UNIT,
    reconstruction_notes=NOTES,
    cast=CAST,
    scenes=[{k: s[k] for k in ('scene_no', 'title_ar', 'title_en', 'icon', 'era', 'summary_en', 'lines')} for s in SCENES],
)

if __name__ == '__main__':
    j = json.dumps(DOC, ensure_ascii=False, separators=(',', ':')).replace("'", "''")
    print(f"UPDATE ar_text_unit SET script_json = '{j}' WHERE id = '{UNIT}';")
