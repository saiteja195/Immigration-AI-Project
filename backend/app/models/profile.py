from datetime import date

from pydantic import BaseModel, Field, field_validator

from app.services.visas import get_visa


class _VisaChecked(BaseModel):
    visa_type: str

    @field_validator("visa_type")
    @classmethod
    def _known_visa(cls, code: str) -> str:
        if get_visa(code) is None:
            raise ValueError("Unknown visa or status.")
        return code


class ProfileIn(_VisaChecked):
    country_of_citizenship: str = Field(default="India", max_length=60)
    employer_or_school: str = Field(default="", max_length=120)
    i94_expiry: date | None = None
    visa_stamp_expiry: date | None = None
    passport_expiry: date | None = None
    ead_expiry: date | None = None
    i20_end_date: date | None = None
    i797_expiry: date | None = None
    ds2019_end_date: date | None = None
    green_card_expiry: date | None = None
    conditional_residence_expiry: date | None = None
    advance_parole_expiry: date | None = None
    esta_expiry: date | None = None


class ProfileOut(ProfileIn):
    pass


class DependentIn(_VisaChecked):
    name: str = Field(min_length=1, max_length=100)
    relationship: str = Field(max_length=40)  # spouse, child
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
