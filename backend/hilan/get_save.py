from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
from django.utils import simplejson as json
import cgi
from models import get_hltr, get_hlts, Highlights

class SaveAnn(webapp.RequestHandler):
    def post(self):
        self.response.headers['Content-Type'] = 'text/plain'
        hltr_name = cgi.escape(self.request.get('un'))
        hltr = get_hltr(hltr_name)
        if not hltr:
            self.response.out.write('1')
            return
        pw = cgi.escape(self.request.get('pw'))
        if hltr.name_pw != hltr_name + pw :
            self.response.out.write('1')
            return
        url = cgi.escape(self.request.get('url'))
        hstr = cgi.escape(self.request.get('hstr'))
        ann = cgi.escape(self.request.get('ann'))
        kn = (hltr_name + url)[:450]
        hlts = get_hlts(kn) or Highlights(key_name = kn)
        if hstr in hlts.hlt_strs:
            i = hlts.hlt_strs.index(hstr)
            hlts.annotations[i] = ann
        else :
            hlts.hlt_strs.append(hstr)
            hlts.annotations.append(ann)
        hlts.put()
        self.response.out.write('0')

class GetAnns(webapp.RequestHandler):
    def post(self):
        self.response.headers['Content-Type'] = 'application/json'
        hltr_name = cgi.escape(self.request.get('un'))
        hltr = get_hltr(hltr_name)
        if not hltr:
            self.response.out.write(
                    json.dumps({'hltr_error' : 'Wrong user or password'}))
            return
        pw = cgi.escape(self.request.get('pw'))
        if hltr.name_pw != hltr_name + pw :
            self.response.out.write(
                    json.dumps({'hltr_error' : 'Wrong user or password'}))
            return
        url = cgi.escape(self.request.get('url'))
        str_ann = {}
        all_names = [hltr_name] + hltr.friend_of
        all_hlts = [ get_hlts((hn + url)[:450]) for hn in all_names]
        for hn, hlts in zip(all_names, all_hlts) :
            if hlts and hn not in hltr.blocked_hltrs :
                for hstr, ann in zip(hlts.hlt_strs, hlts.annotations):
                    str_ann.setdefault(hstr, []).append(
                            {'annotator' : hn, 'annotation' : ann})
        self.response.out.write(json.dumps(str_ann))

class DelAnn(webapp.RequestHandler):
    def post(self):
        self.response.headers['Content-Type'] = 'text/plain'
        hltr_name = cgi.escape(self.request.get('un'))
        hltr = get_hltr(hltr_name)
        if not hltr:
            self.response.out.write('1')
            return
        pw = cgi.escape(self.request.get('pw'))
        if hltr.name_pw != hltr_name + pw :
            self.response.out.write('1')
            return
        url = cgi.escape(self.request.get('url'))
        hstr = cgi.escape(self.request.get('hstr'))
        kn = (hltr_name + url)[:450]
        hlts = get_hlts(kn)
        if hlts and hstr in hlts.hlt_strs :
            i = hlts.hlt_strs.index(hstr)
            hlts.hlt_strs.remove(hstr)
            hlts.annotations.pop(i)
            hlts.put()
        self.response.out.write('0')

class DelAll(webapp.RequestHandler):
    def post(self):
        self.response.headers['Content-Type'] = 'text/plain'
        hltr_name = cgi.escape(self.request.get('un'))
        hltr = get_hltr(hltr_name)
        if not hltr:
            self.response.out.write('1')
            return
        pw = cgi.escape(self.request.get('pw'))
        if hltr.name_pw != hltr_name + pw :
            self.response.out.write('1')
            return
        url = cgi.escape(self.request.get('url'))
        kn = (hltr_name + url)[:450]
        hlts = get_hlts(kn)
        if hlts :
            hlts.delete()
        self.response.out.write('0')

application = webapp.WSGIApplication([('/saveann', SaveAnn),
                                        ('/getanns', GetAnns),
                                        ('/delann', DelAnn),
                                        ('/delall', DelAll)], debug = True )

def main():
    run_wsgi_app(application)

if __name__ == '__main__':
    main()

