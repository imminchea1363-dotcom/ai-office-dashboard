#!/usr/bin/env python3
"""Manual/observed Hermes state signal sender. Never executes Hermes; never publishes content."""
import argparse
import json
import os
import sys
import urllib.error
import urllib.request

URL='https://dongbaek-api.imminchea1363.workers.dev/api/phone1/agent/heartbeat'
STATES=('idle','working','paused','error')
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,req,fp,code,msg,headers,newurl):
  raise RuntimeError('Redirect rejected. No token forwarded.')
def send(state,task_title='',source='manual'):
 token=os.environ.get('HERMES_AGENT_TOKEN','')
 if not 32<=len(token)<=256 or not all(33<=ord(ch)<=126 for ch in token):
  raise RuntimeError('HERMES_AGENT_TOKEN is not configured. Do not expose it in terminal output.')
 if state not in STATES or source not in ('manual','hermes_runtime'):
  raise ValueError('Invalid state or source')
 if len(task_title)>120:
  raise ValueError('Task title is too long')
 payload={'state':state,'source':source}
 if state=='working' and task_title:payload['taskTitle']=task_title
 body=json.dumps(payload,ensure_ascii=False).encode('utf-8')
 request=urllib.request.Request(URL,data=body,method='POST',headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'})
 client=urllib.request.build_opener(NoRedirect())
 try:
  with client.open(request,timeout=15) as response:
   data=json.loads(response.read(4096).decode('utf-8'))
   if response.status!=200 or data.get('accepted') is not True:raise RuntimeError('Server did not accept heartbeat')
   return data
 except urllib.error.HTTPError as error:
  raise RuntimeError('Heartbeat not accepted (HTTP '+str(error.code)+')') from None
 except urllib.error.URLError:
  raise RuntimeError('Network unavailable. Laptop must not assume Hermes is online.') from None

def main():
 parser=argparse.ArgumentParser(description='Dongbaek phone1 Hermes truthful status sender')
 parser.add_argument('--state',required=True,choices=STATES)
 parser.add_argument('--task-title',default='')
 parser.add_argument('--source',choices=('manual','hermes_runtime'),default='manual',help='Use hermes_runtime ONLY for observed Hermes lifecycle events')
 args=parser.parse_args()
 try:
  result=send(args.state,args.task_title,args.source)
  print('Phone1 heartbeat accepted: '+result['state'])
  return 0
 except (RuntimeError,ValueError,KeyError) as e:
  print('Heartbeat not confirmed: '+str(e),file=sys.stderr)
  return 1
if __name__=='__main__':sys.exit(main())