import importlib.util
import io
import json
import os
import unittest
from pathlib import Path
from unittest.mock import patch

FILE=Path(__file__).resolve().parents[1]/'server'/'phone1_presence_sender.py'
spec=importlib.util.spec_from_file_location('phone1_presence_sender',FILE)
sender=importlib.util.module_from_spec(spec)
spec.loader.exec_module(sender)

class Response:
 status=200
 def __enter__(self):return self
 def __exit__(self,*args):return False
 def read(self,n):return json.dumps({'accepted':True,'state':'working'}).encode('utf-8')

class Opener:
 def __init__(self):self.sent=None
 def open(self,request,timeout):self.sent=(request,timeout);return Response()

class PresenceSenderTest(unittest.TestCase):
 def test_observed_signal_one_shot_without_executing_hermes(self):
  opener=Opener()
  with patch.dict(os.environ,{'HERMES_AGENT_TOKEN':'test-only-sender-token-01234567890123456'}),patch.object(sender.urllib.request,'build_opener',return_value=opener):
   result=sender.send('working','실제 조사 작업','hermes_runtime')
  self.assertTrue(result['accepted'])
  request,timeout=opener.sent
  self.assertEqual(request.full_url,sender.URL)
  self.assertEqual(request.get_method(),'POST')
  self.assertEqual(json.loads(request.data),{'state':'working','source':'hermes_runtime','taskTitle':'실제 조사 작업'})
  self.assertEqual(timeout,15)

 def test_no_token_and_no_invalid_state(self):
  with patch.dict(os.environ,{'HERMES_AGENT_TOKEN':''}):
   with self.assertRaises(RuntimeError):sender.send('idle')
  with patch.dict(os.environ,{'HERMES_AGENT_TOKEN':'t'*40}):
   with self.assertRaises(ValueError):sender.send('completed')
   with self.assertRaises(ValueError):sender.send('working','x'*121)

if __name__=='__main__':unittest.main()