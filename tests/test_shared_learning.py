"""Shared learning pilot contract tests; run: python -m unittest tests.test_shared_learning"""
import os
import unittest
from unittest.mock import patch
from server.shared_learning import (LibraryError,lookup_lecture,media_for_concept,
                                    candidate_plans,publish_lecture,publish_media,clean_snapshot)

class SharedLibraryTests(unittest.TestCase):
    def test_unconfigured_db_is_not_falsely_enabled(self):
        with patch.dict(os.environ,{},clear=True):
            with self.assertRaises(LibraryError) as error:
                lookup_lecture("file","a"*64)
        self.assertEqual(error.exception.code,"SHARED_LIBRARY_NOT_CONFIGURED")
    def test_invalid_digest_rejected_before_query(self):
        with self.assertRaises(LibraryError):
            lookup_lecture("file","not_a_sha256")
    def test_invalid_media_key_rejected(self):
        with self.assertRaises(LibraryError):
            media_for_concept("../other")
    def test_staging_rejected_without_curator_credentials(self):
        with patch.dict(os.environ,{},clear=True):
            with self.assertRaises(LibraryError):
                publish_lecture({},"")
            with self.assertRaises(LibraryError):
                publish_media({},"")
    def test_student_plans_do_not_charge(self):
        plans=candidate_plans()
        self.assertFalse(plans["billing_enabled"])
        self.assertEqual({p["code"]:p["price_halalas"] for p in plans["plans"]},
            {"free":0,"student":900,"student_plus":1900})
    def test_no_private_images_or_unknown_user_fields_in_snapshot(self):
        snapshot={"name":"Nerve Lecture","student_email":"private@example.test",
          "sources":[{"id":"p1","page":1,"title":"Neuron","text":"Sodium movement",
                      "image":"data:image/png;base64,PRIVATE","notes":"private text","observations":[]}],
          "outline":{"title":"Neuron","chapters":[{"title":"Basics","source_ids":["p1"]}]},
          "chapters":{},"simulations":{}}
        safe=clean_snapshot(snapshot)
        self.assertNotIn("student_email",safe)
        self.assertNotIn("image",safe["sources"][0])
        self.assertNotIn("notes",safe["sources"][0])

if __name__=="__main__":
    unittest.main()
