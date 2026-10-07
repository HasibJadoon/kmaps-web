-- qr_096: shorter, plainer intro lines for two sections of the word screen.
UPDATE qr_study_label SET detail = 'What the word means with what comes after it. Every use in the Qurʾān is counted, with a verse.' WHERE scope = 'sarf_section' AND key = 'constructions';
UPDATE qr_study_label SET detail = 'Words the books set against it, and words that hold both meanings.' WHERE scope = 'sarf_section' AND key = 'opposites';
