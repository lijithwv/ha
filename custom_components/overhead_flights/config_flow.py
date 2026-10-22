import probatio

from homeassistant.config_entries import ConfigFlow

from .const import DOMAIN, NAME
from .validation import settings_schema


class OverheadFlightsConfigFlow(ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def async_step_user(self, user_input=None):
        if self._async_current_entries():
            return self.async_abort(reason="single_instance_allowed")
        errors = {}
        if user_input is not None:
            try:
                settings = settings_schema()(user_input)
            except probatio.Invalid:
                errors["base"] = "invalid_settings"
            else:
                await self.async_set_unique_id(DOMAIN)
                self._abort_if_unique_id_configured()
                return self.async_create_entry(title=NAME, data=settings)
        return self.async_show_form(
            step_id="user", data_schema=settings_schema(user_input, form=True), errors=errors
        )

    async def async_step_import(self, user_input):
        return await self.async_step_user(user_input)

    async def async_step_reconfigure(self, user_input=None):
        entry = self._get_reconfigure_entry()
        errors = {}
        if user_input is not None:
            try:
                settings = settings_schema()(user_input)
            except probatio.Invalid:
                errors["base"] = "invalid_settings"
            else:
                return self.async_update_reload_and_abort(entry, data=settings)
        return self.async_show_form(
            step_id="reconfigure",
            data_schema=settings_schema(user_input or entry.data, form=True),
            errors=errors,
        )
