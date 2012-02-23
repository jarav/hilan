from google.appengine.ext import webapp
from google.appengine.ext.webapp import template
from google.appengine.ext.webapp.util import run_wsgi_app
import cgi
import models

class SignupPage(webapp.RequestHandler):
    def get(self):
        self.response.headers['Content-Type'] = 'text/html'
        self.response.out.write(template.render('signup.html', {}))

    def post(self):
        self.response.headers['Content-Type'] = 'text/html'
        un = cgi.escape(self.request.get('user_name'))
        user_exists = un_too_small = pw_too_small = pwds_no_match = False
        hltr = models.get_hltr(un)
        if hltr :
            user_exists = True
        else:
            if len(un) < 3:
                un_too_small = True
            else:
                pw1 = cgi.escape(self.request.get('pw1'))
                pw2 = cgi.escape(self.request.get('pw2'))
                if len(pw1) < 3:
                    pw_too_small = True
                elif pw1 != pw2:
                    pwds_no_match = True
                else:
                    name_pw = un + pw1
                    hltr = models.Highlighter(key_name = un, hltr_name = un,
                            name_pw = name_pw)
                    hltr.put()
        template_values = {'user_exists' : user_exists, 'un_too_small' : un_too_small,
                            'pw_too_small' : pw_too_small,
                            'pwds_no_match' : pwds_no_match, 'un' : un }
        self.response.out.write(template.render('post_signup.html',
                                                        template_values))



application = webapp.WSGIApplication([('/signup', SignupPage)], debug = True)

def main():
    run_wsgi_app(application)

if __name__ == '__main__':
    main()

