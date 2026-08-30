UPDATE ar_ling_gram_term SET term_order = 20 WHERE id = 'GT:form_family:rubai_faalala';
UPDATE ar_ling_gram_term SET term_order = 21 WHERE id = 'GT:form_family:rubai_tafaalala';
UPDATE ar_ling_gram_term SET term_order = 28 WHERE id = 'GT:form_family:noun_derivatives';

INSERT OR IGNORE INTO ar_ling_gram_term
  (id, category_key, term_key, term_order, name_ar, name_en, name_ur, short_ar, short_en, short_ur, status)
VALUES
  ('GT:form_family:form_xiii', 'form_family', 'form_xiii', 19,
   'الافعوّال', 'Form XIII', 'باب افعوّال', 'افْعَوَّلَ', 'ifʿawwala', 'افعوّل', 'live'),

  ('GT:form_family:rubai_ifanlala', 'form_family', 'rubai_ifanlala', 22,
   'الافعنلال', 'quadriliteral III', 'رباعی سوم', 'افْعَنْلَلَ', 'ifʿanlala', 'افعنلل', 'live'),

  ('GT:form_family:rubai_ifalalla', 'form_family', 'rubai_ifalalla', 23,
   'الافعللال', 'quadriliteral IV', 'رباعی چہارم', 'افْعَلَلَّ', 'ifʿalalla', 'افعللّ', 'live'),

  ('GT:form_family:rubai_mudaaf_fafaa', 'form_family', 'rubai_mudaaf_fafaa', 24,
   'الرباعيّ المضاعف', 'reduplicative quadriliteral I', 'رباعی مضاعف اوّل', 'فَعْفَعَ', 'faʿfaʿa', 'فعفع', 'live'),

  ('GT:form_family:rubai_mudaaf_tafafaa', 'form_family', 'rubai_mudaaf_tafafaa', 25,
   'التفعفع', 'reduplicative quadriliteral II', 'رباعی مضاعف دوم', 'تَفَعْفَعَ', 'tafaʿfaʿa', 'تفعفع', 'live'),

  ('GT:form_family:rubai_mudaaf_ifanfaa', 'form_family', 'rubai_mudaaf_ifanfaa', 26,
   'الافعنفاع', 'reduplicative quadriliteral III', 'رباعی مضاعف سوم', 'افْعَنْفَعَ', 'ifʿanfaʿa', 'افعنفع', 'live'),

  ('GT:form_family:rubai_mudaaf_ifafaa', 'form_family', 'rubai_mudaaf_ifafaa', 27,
   'الافعفعال', 'reduplicative quadriliteral IV', 'رباعی مضاعف چہارم', 'افْعَفَعَّ', 'ifʿafaʿʿa', 'افعفعّ', 'live');
