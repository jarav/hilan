from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
from django.utils import simplejson as json
import cgi
import models

class SigninPage(webapp.RequestHandler):
    def post(self):
        self.response.headers['Content-Type'] = 'application/json'
        hltr_name = cgi.escape(self.request.get('hltr_name'))
        if len(hltr_name) < 3 :
            jsonOut(self, 1, 'User name should be more than 2 characters')
            return
        pw = cgi.escape(self.request.get('pw'))
        if len(pw) < 3 :
            jsonOut(self, 1,'Password should be more than 2 characters')
            return
        hltr = models.get_hltr(hltr_name)
        if hltr :
            if hltr.name_pw == hltr_name + pw :
                jsonOut(self, 0, 'You are signed in, "' + hltr_name + '".',
                        friends_list = hltr.friends,
                        blocked_list = hltr.blocked_hltrs)
                return
        jsonOut(self, 1, 'Either your user name or password or both are wrong.')

class AddFriend(webapp.RequestHandler):
    def post(self):
        self.response.headers['Content-Type'] = 'application/json'
        hltr_name = cgi.escape(self.request.get('hltr_name'))
        hltr = models.get_hltr(hltr_name)
        friend_name = cgi.escape(self.request.get('friend_name'))
        status, status_msg = validateOther(hltr_name, friend_name)
        if not status:
            jsonOut(self, 1, status_msg)
            return
        frnd_hltr = models.get_hltr(friend_name)
        if frnd_hltr :
            if friend_name in hltr.friends :
                jsonOut(self, 1, '"' + friend_name + '"' +
                        ' is already your friend.')
            else :
                hltr.friends.append(friend_name)
                frnd_hltr.friend_of.append(hltr_name)
                hltr.put()
                frnd_hltr.put()
                jsonOut(self, 0, '"' + friend_name + '"' +
                        ' has been added as your friend.',
                        friends_list = hltr.friends)
        else :
            jsonOut(self, 1, 'There is no user with the name "' +
                    friend_name +'".')

class RemoveFriend(webapp.RequestHandler):
    def post(self):
        self.response.headers['Content-Type'] = 'application/json'
        hltr_name = cgi.escape(self.request.get('hltr_name'))
        hltr = models.get_hltr(hltr_name)
        friend_name = cgi.escape(self.request.get('friend_name'))
        status, status_msg = validateOther(hltr_name, friend_name)
        if not status:
            jsonOut(self, 1, status_msg)
            return
        frnd_hltr = models.get_hltr(friend_name)
        if frnd_hltr :
            if friend_name not in hltr.friends :
                jsonOut(self, 1, '"' + friend_name +
                        '" is not your friend anyway.')
            else :
                hltr.friends.remove(friend_name)
                frnd_hltr.friend_of.remove(hltr_name)
                hltr.put()
                frnd_hltr.put()
                jsonOut(self, 0, '"' + friend_name +
                        '" is no longer your friend.',
                        friends_list = hltr.friends)
        else :
            jsonOut(self, 1, 'There is no user with the name "' +
                    friend_name + '".')

class BlockHltr(webapp.RequestHandler):
    def post(self):
        self.response.headers['Content-Type'] = 'application/json'
        hltr_name = cgi.escape(self.request.get('hltr_name'))
        hltr = models.get_hltr(hltr_name)
        other_hltr_name = cgi.escape(self.request.get('other_hltr_name'))
        status, status_msg = validateOther(hltr_name, other_hltr_name)
        if not status:
            jsonOut(self, 1, status_msg)
            return
        other_hltr = models.get_hltr(other_hltr_name)
        if other_hltr :
            if other_hltr_name in hltr.blocked_hltrs :
                jsonOut(self, 1, '"' + other_hltr_name +
                        '" is already blocked.')
            else :
                hltr.blocked_hltrs.append(other_hltr_name)
                hltr.put()
                jsonOut(self, 0, '"' + other_hltr_name + '" has been blocked.',
                        blocked_list = hltr.blocked_hltrs)
        else :
            jsonOut(self, 1, 'There is no user with the name "' +
                    other_hltr_name +'".')

class UnBlockHltr(webapp.RequestHandler):
    def post(self):
        self.response.headers['Content-Type'] = 'application/json'
        hltr_name = cgi.escape(self.request.get('hltr_name'))
        hltr = models.get_hltr(hltr_name)
        other_hltr_name = cgi.escape(self.request.get('other_hltr_name'))
        status, status_msg = validateOther(hltr_name, other_hltr_name)
        if not status:
            jsonOut(self, 1, status_msg)
            return
        other_hltr = models.get_hltr(other_hltr_name)
        if other_hltr :
            if other_hltr_name not in hltr.blocked_hltrs :
                jsonOut(self, 1, '"' + other_hltr_name +
                        '" is not blocked anyway.')
            else :
                hltr.blocked_hltrs.remove(other_hltr_name)
                hltr.put()
                jsonOut(self, 0, '"' + other_hltr_name +
                        '" has been unblocked.',
                        blocked_list = hltr.blocked_hltrs)
        else :
            jsonOut(self, 1, 'There is no user with the name "' +
                    other_hltr_name +'".')

def jsonOut(rh, status, msg, friends_list = [], blocked_list = []):
    rh.response.out.write( json.dumps({'status' : status, 'msg' : msg,
        'friends' : friends_list, 'blocked' : blocked_list}) )

def validateOther(hltr_name, other_name):
    status = True
    status_msg = ""
    if len(other_name) < 3 :
        status_msg = "Name should be more than 2 characters"
        status = False
    elif other_name == hltr_name :
        status_msg = "Do not use your own name for a friend or for someone you want to block."
        status = False
    return (status, status_msg)

application = webapp.WSGIApplication([('/signin', SigninPage),
                                        ('/addfriend', AddFriend),
                                        ('/removefriend', RemoveFriend),
                                        ('/blockuser', BlockHltr),
                                        ('/unblockuser', UnBlockHltr)],
                                        debug = True )

def main():
    run_wsgi_app(application)

if __name__ == '__main__':
    main()

