import importlib.util,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('build_epg',Path(__file__).resolve().parents[1]/'scripts/build-epg.py')
epg=importlib.util.module_from_spec(spec);spec.loader.exec_module(epg)
class EpgTest(unittest.TestCase):
 def test_offsets(self):self.assertEqual(epg.stamp('20261106183000 +0330'),epg.stamp('20261106150000 +0000'))
 def test_invalid_time(self):self.assertIsNone(epg.stamp('not a date'))
 def test_soccer(self):self.assertTrue(epg.soccer('UEFA Champions League',['Sports']))
 def test_american_football(self):self.assertFalse(epg.soccer('College Football',['Football']))
 def test_territories_preserved(self):self.assertNotEqual(epg.normal('BBC One Wales HD'),epg.normal('BBC One London HD'))
if __name__=='__main__':unittest.main()
