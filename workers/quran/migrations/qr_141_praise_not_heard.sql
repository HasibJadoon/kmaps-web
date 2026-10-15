-- qr_141 · the praise after a right answer: 'Well heard' named a listening drill, but it was said after every drill
UPDATE qr_study_label SET label = replace(label, 'Well heard | ', ''), label_ar = replace(label_ar, 'أحسنت | ', '') WHERE scope='stage' AND key='praise';
