import importlib.util
from pathlib import Path
import unittest


spec = importlib.util.spec_from_file_location(
    "check_bins", Path(__file__).resolve().parents[1] / "frigate_ai/check_bins.py"
)
check_bins = importlib.util.module_from_spec(spec)
spec.loader.exec_module(check_bins)


class BinCheckTests(unittest.TestCase):
    def setUp(self):
        self.settings = {
            "pickup_polygon": [[0.1, 0.3], [0.5, 0.3], [0.5, 0.7], [0.1, 0.7]],
            "minimum_bins": 2,
            "minimum_confidence": 0.85,
            "expected_secondary": "yellow",
        }

    def result(self, bins, clear=True):
        return check_bins.classify(
            {"visibility_clear": clear, "bins": bins, "reason": "Test"}, self.settings
        )

    def bin(self, x=0.3, y=0.5, confidence=0.95, collection=True, colour="red"):
        return {"ground_x": x, "ground_y": y, "confidence": confidence,
                "at_collection_position": collection, "lid_colour": colour}

    def test_neighbours_bins_cannot_pass_check(self):
        result = self.result([self.bin(x=0.8), self.bin(y=0.1)])
        self.assertEqual(result["status"], "missing")
        self.assertEqual(result["bin_count"], 0)

    def test_correct_pair_at_pickup_position_passes(self):
        self.assertEqual(self.result([self.bin(), self.bin(colour="yellow")])["status"], "out")

    def test_wrong_week_colour_cannot_pass(self):
        self.assertEqual(self.result([self.bin(), self.bin(colour="green")])["status"], "missing")

    def test_green_week_pair_passes(self):
        self.settings["expected_secondary"] = "green"
        self.assertEqual(self.result([self.bin(), self.bin(colour="green")])["status"], "out")

    def test_unknown_week_cannot_pass(self):
        self.settings["expected_secondary"] = "unknown"
        self.assertEqual(self.result([self.bin(), self.bin(colour="yellow")])["status"], "uncertain")

    def test_clear_empty_area_is_missing_without_calendar(self):
        self.settings["expected_secondary"] = "unknown"
        self.assertEqual(self.result([])["status"], "missing")

    def test_obscured_empty_area_stays_uncertain_without_calendar(self):
        self.settings["expected_secondary"] = "unknown"
        self.assertEqual(self.result([], clear=False)["status"], "uncertain")

    def test_neighbours_bins_do_not_require_our_calendar(self):
        self.settings["expected_secondary"] = "unknown"
        self.assertEqual(self.result([self.bin(x=0.8)])["status"], "missing")

    def test_infrared_unknown_lid_colour_cannot_pass(self):
        self.assertEqual(self.result([self.bin(), self.bin(colour="unknown")])["status"], "uncertain")

    def test_storage_position_does_not_count(self):
        self.assertEqual(self.result([self.bin(collection=False)])["status"], "missing")

    def test_poor_visibility_cannot_pass(self):
        self.assertEqual(self.result([self.bin()], clear=False)["status"], "uncertain")

    def test_low_confidence_cannot_pass(self):
        self.assertEqual(self.result([self.bin(confidence=0.5)])["status"], "uncertain")

    def test_required_count_is_enforced(self):
        self.settings["minimum_bins"] = 2
        self.assertEqual(self.result([self.bin()])["status"], "missing")

    def test_invalid_model_coordinates_are_rejected(self):
        for x in (-0.1, 1.1, float("nan"), True):
            with self.subTest(x=x), self.assertRaises(ValueError):
                self.result([self.bin(x=x)])

    def test_invalid_settings_are_rejected(self):
        self.settings["minimum_bins"] = 0
        with self.assertRaises(ValueError):
            check_bins.validate_settings(self.settings)


if __name__ == "__main__":
    unittest.main()
