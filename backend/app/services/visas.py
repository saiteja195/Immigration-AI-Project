"""Catalog of the visa and immigration statuses the app understands.

The codes of the first group match values already saved in profiles, so older data keeps working.
Descriptions are short, general summaries, not legal advice.
"""
from dataclasses import dataclass

CATEGORIES = [
    {"id": "work", "label": "Work"},
    {"id": "student", "label": "Student and exchange"},
    {"id": "family", "label": "Spouse and family"},
    {"id": "visitor", "label": "Visitor and tourist"},
    {"id": "immigrant", "label": "Green card and immigration"},
    {"id": "other", "label": "Other"},
]

# Every date the profile can hold, with its label.
DATE_LABELS = {
    "i94_expiry": "I-94 expiry",
    "visa_stamp_expiry": "Visa stamp expiry",
    "passport_expiry": "Passport expiry",
    "ead_expiry": "EAD expiry",
    "i20_end_date": "I-20 end date",
    "i797_expiry": "I-797 approval expiry",
    "ds2019_end_date": "DS-2019 end date",
    "green_card_expiry": "Green card expiry",
    "conditional_residence_expiry": "Conditional residence ends",
    "advance_parole_expiry": "Advance parole expiry",
    "esta_expiry": "ESTA expiry",
}

_WORK = ("i94_expiry", "visa_stamp_expiry", "passport_expiry", "i797_expiry")


@dataclass(frozen=True)
class Visa:
    code: str
    category: str
    name: str
    description: str
    dates: tuple[str, ...]


VISAS: list[Visa] = [
    # Work
    Visa("H-1B", "work", "H-1B specialty occupation", "Employer-sponsored professional job. Usually up to 6 years in total, with exceptions.", _WORK),
    Visa("L-1", "work", "L-1 intracompany transferee", "Managers and specialized-knowledge staff moved within the same company group. Spouse gets L-2.", _WORK),
    Visa("O-1", "work", "O-1 extraordinary ability", "People with extraordinary ability, sponsored by an employer or agent.", _WORK),
    Visa("E-3", "work", "E-3 (Australia)", "Specialty occupation workers from Australia. Spouse gets E-3D.", _WORK),
    Visa("E-2", "work", "E-2 treaty investor", "Investors and key staff of businesses from treaty countries.", _WORK),
    Visa("TN", "work", "TN (Canada, Mexico)", "Canadian and Mexican professionals under USMCA. Spouse gets TD.", _WORK),
    # Student and exchange
    Visa("F-1", "student", "F-1 student", "Full-time academic student. Stay is tied to your I-20.", ("i20_end_date", "visa_stamp_expiry", "passport_expiry")),
    Visa("F-1 OPT", "student", "F-1 on OPT", "Work permit after your studies. Needs a valid EAD.", ("ead_expiry", "i20_end_date", "visa_stamp_expiry", "passport_expiry")),
    Visa("F-1 STEM OPT", "student", "F-1 on STEM OPT", "24-month extension of OPT for STEM degrees.", ("ead_expiry", "i20_end_date", "visa_stamp_expiry", "passport_expiry")),
    Visa("M-1", "student", "M-1 vocational student", "Vocational or technical study. Stay is tied to your I-20.", ("i20_end_date", "i94_expiry", "visa_stamp_expiry", "passport_expiry")),
    Visa("J-1", "student", "J-1 exchange visitor", "Exchange programs such as research, training or study. Stay is tied to your DS-2019.", ("ds2019_end_date", "visa_stamp_expiry", "passport_expiry")),
    # Spouse and family
    Visa("H-4", "family", "H-4 spouse or child of H-1B", "Dependent of an H-1B worker. Work needs an H-4 EAD, and only some spouses qualify.", ("i94_expiry", "visa_stamp_expiry", "passport_expiry", "i797_expiry")),
    Visa("H-4 EAD", "family", "H-4 with work permit", "H-4 spouse who holds an EAD and can work.", ("ead_expiry", "i94_expiry", "visa_stamp_expiry", "passport_expiry", "i797_expiry")),
    Visa("F-2", "family", "F-2 spouse or child of F-1", "Dependent of a student. Cannot work, and study is limited.", ("i20_end_date", "visa_stamp_expiry", "passport_expiry")),
    Visa("L-2", "family", "L-2 spouse or child of L-1", "Dependent of an L-1 worker. Spouses can usually work.", ("i94_expiry", "visa_stamp_expiry", "passport_expiry", "ead_expiry")),
    Visa("J-2", "family", "J-2 spouse or child of J-1", "Dependent of an exchange visitor. Can apply for an EAD.", ("ds2019_end_date", "ead_expiry", "i94_expiry", "visa_stamp_expiry", "passport_expiry")),
    Visa("E-3D", "family", "E-3D spouse or child of E-3", "Dependent of an E-3 worker. Spouses can usually work.", ("i94_expiry", "visa_stamp_expiry", "passport_expiry", "ead_expiry")),
    Visa("O-3", "family", "O-3 spouse or child of O-1", "Dependent of an O-1 worker. Cannot work.", ("i94_expiry", "visa_stamp_expiry", "passport_expiry")),
    Visa("TD", "family", "TD spouse or child of TN", "Dependent of a TN worker. Cannot work.", ("i94_expiry", "visa_stamp_expiry", "passport_expiry")),
    # Visitor and tourist
    Visa("B-1/B-2", "visitor", "B-1/B-2 visitor", "Business or tourist visit. Often up to 6 months, and an extension is possible with Form I-539.", ("i94_expiry", "visa_stamp_expiry", "passport_expiry")),
    Visa("ESTA", "visitor", "ESTA (Visa Waiver)", "Short visits of up to 90 days for eligible countries. Generally cannot be extended.", ("esta_expiry", "i94_expiry", "passport_expiry")),
    # Green card and immigration
    Visa("K-1", "immigrant", "K-1 fiancé(e)", "Fiancé(e) of a US citizen. You must marry within 90 days of arrival, then apply for a green card.", ("i94_expiry", "ead_expiry", "passport_expiry")),
    Visa("Conditional Green Card", "immigrant", "Conditional green card (2 years)", "Green card based on a recent marriage. File Form I-751 in the 90 days before it ends.", ("conditional_residence_expiry", "green_card_expiry", "passport_expiry")),
    Visa("Green Card Pending", "immigrant", "Green card pending (I-485)", "Adjustment of status is pending. A work permit and travel document may be available.", ("ead_expiry", "advance_parole_expiry", "i94_expiry", "passport_expiry")),
    Visa("Green Card", "immigrant", "Permanent resident", "Lawful permanent resident. The card is usually valid for 10 years and must be renewed.", ("green_card_expiry", "passport_expiry")),
    # Other
    Visa("Other", "other", "Other status", "Anything not listed above.", ("i94_expiry", "visa_stamp_expiry", "passport_expiry", "ead_expiry")),
]

_BY_CODE = {v.code: v for v in VISAS}


def visa_codes() -> list[str]:
    return [v.code for v in VISAS]


def get_visa(code: str) -> Visa | None:
    return _BY_CODE.get(code)


def catalog() -> dict:
    return {
        "categories": CATEGORIES,
        "visas": [
            {
                "code": v.code, "category": v.category, "name": v.name, "description": v.description,
                "dates": [{"field": f, "label": DATE_LABELS[f]} for f in v.dates],
            }
            for v in VISAS
        ],
    }
