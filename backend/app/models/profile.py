from datetime import date
from enum import Enum

from pydantic import BaseModel, Field


class VisaType(str, Enum):
    F1 = "F-1"
    F1_OPT = "F-1 OPT"
    F1_STEM_OPT = "F-1 STEM OPT"
    F2 = "F-2"
    H1B = "H-1B"
    H4 = "H-4"
    H4_EAD = "H-4 EAD"
    GC_PENDING = "Green Card Pending"
    GC = "Green Card"
    OTHER = "Other"


class ProfileIn(BaseModel):
    visa_type: VisaType
    country_of_citizenship: str = Field(default="India", max_length=60)
    employer_or_school: str = Field(default="", max_length=120)
    i94_expiry: date | None = None
    visa_stamp_expiry: date | None = None
    passport_expiry: date | None = None
    ead_expiry: date | None = None
    i20_end_date: date | None = None
    i797_expiry: date | None = None


class ProfileOut(ProfileIn):
    pass


class DependentIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    relationship: str = Field(max_length=40)  # spouse, child
    visa_type: VisaType
    i94_expiry: date | None = None
    passport_expiry: date | None = None
    ead_expiry: date | None = None


class DependentOut(DependentIn):
    id: str


class KeyDateOut(BaseModel):
    label: str
    owner: str  # "me" or a dependent's name
    due: date
    days_left: int
