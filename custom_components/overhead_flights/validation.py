import math
import re

import probatio

from homeassistant.const import CONF_LATITUDE, CONF_LONGITUDE
from homeassistant.helpers import config_validation as cv

from .const import CONF_PHOTO_CONTACT


def photo_contact(value):
    contact = cv.string(value).strip()
    if not (
        re.fullmatch(r"[^\s@()]+@[^\s@()]+\.[^\s@()]+", contact)
        or re.fullmatch(r"https://[^\s()]+", contact)
    ):
        raise probatio.Invalid("Enter a contact email or HTTPS URL")
    return contact


def finite_coordinate(validator):
    def validate(value):
        if isinstance(value, bool):
            raise probatio.Invalid("Enter a numeric coordinate")
        coordinate = validator(value)
        if not math.isfinite(coordinate):
            raise probatio.Invalid("Enter a finite coordinate")
        return coordinate

    return validate


def settings_schema(defaults=None, *, form=False):
    defaults = defaults or {}

    def required(key):
        if key in defaults:
            return probatio.Required(key, default=defaults[key])
        return probatio.Required(key)

    return probatio.Schema(
        {
            required(CONF_LATITUDE): cv.latitude if form else finite_coordinate(cv.latitude),
            required(CONF_LONGITUDE): cv.longitude if form else finite_coordinate(cv.longitude),
            required(CONF_PHOTO_CONTACT): str if form else photo_contact,
        }
    )
