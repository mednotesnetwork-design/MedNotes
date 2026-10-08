"""Server-side lecture worker contracts without external DB/provider calls."""
import unittest
from unittest.mock import patch
from server.lecture_jobs import retry_delay,configured,JobError

class DurableJobTests(unittest.TestCase):
 def test_retry_exponential_cap(self):
  self.assertEqual([retry_delay(i) for i in range(1,9)],[10,20,40,80,160,300,300,300])
 def test_database_is_opt_in(self):
  with patch.dict('os.environ',{},clear=True):
   self.assertFalse(configured())
 def test_status_codes_are_structured(self):
  err=JobError(503,'DATABASE_NOT_CONFIGURED')
  self.assertEqual((err.status,err.code),(503,'DATABASE_NOT_CONFIGURED'))

if __name__=='__main__':unittest.main()
