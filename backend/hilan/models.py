from google.appengine.ext import db

class Highlighter(db.Model):
    hltr_name = db.StringProperty(required=True)
    name_pw = db.StringProperty(required=True)
    friend_of = db.StringListProperty(default=[])
    friends = db.StringListProperty(default=[])
    blocked_hltrs = db.StringListProperty(default=[])

class Highlights(db.Model):
    hlt_strs = db.StringListProperty(default=[])
    annotations = db.StringListProperty(default=[])


def get_hltr(hltr_name):
    return Highlighter.get_by_key_name(hltr_name) if hltr_name else None

def get_hlts(hlts_key):
    return Highlights.get_by_key_name(hlts_key) if hlts_key else None

