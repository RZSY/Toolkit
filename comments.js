// ============================================================
//  TOOLKIT COMMENTS
//  Powers comments.html. 
// ============================================================

var firebaseConfig = {
    apiKey:            "AIzaSyB_9JF7v-gMN4_q176PUgZjaGy6RjWhV4Y",
    authDomain:        "commforums.firebaseapp.com",
    databaseURL:       "https://commforums-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId:         "commforums",
    storageBucket:     "commforums.firebasestorage.app",
    messagingSenderId: "990280192388",
    appId:             "1:990280192388:web:caa73c921e5a6abd13cdd1",
    measurementId:     "G-933WGHKX6S"
};


var pageId = (window.TOOLKIT_PAGE_ID || window.location.pathname)
    .replace(/[.#$\[\]\/]/g, '_') || 'home';


firebase.initializeApp(firebaseConfig);
var auth        = firebase.auth();
var db          = firebase.database();
var commentsRef = db.ref('toolkit/comments/' + pageId);


var currentUser    = null;  
var currentSort    = 'new';
var allComments    = {};
var openReplies    = {};
var replyListeners = {};


var userVotes     = {};
var userVotesRef  = null;


auth.onAuthStateChanged(function (user) {
    currentUser = user;

    var guestBar = document.getElementById('authBarGuest');
    var userBar  = document.getElementById('authBarUser');
    var nameSpan = document.getElementById('authBarName');
    var compose  = document.getElementById('commentCompose');
    var gate     = document.getElementById('commentGate');

    if (user) {
        // ── Logged in ──
        var displayName = getUserDisplayName(user);

        guestBar.style.display = 'none';
        userBar.style.display  = 'block';
        nameSpan.textContent   = displayName;

        compose.style.display = 'block';
        gate.style.display    = 'none';

        closeAuthModal();
        showToast('Signed in as ' + displayName);

        attachUserVotesListener();
    } else {
        // ── Logged out ──
        guestBar.style.display = 'block';
        userBar.style.display  = 'none';

        compose.style.display = 'none';
        gate.style.display    = 'block';

        detachUserVotesListener();
    }

    renderComments();
});

function getUserDisplayName(user) {
    if (user.displayName) return user.displayName;
    return user.email ? user.email.split('@')[0] : 'Member';
}

function openAuthModal(tab) {
    switchAuthTab(tab || 'login');
    document.getElementById('authOverlay').classList.add('open');
}

function closeAuthModal(e) {
    if (e && e.target !== document.getElementById('authOverlay')) return;
    document.getElementById('authOverlay').classList.remove('open');
    clearAuthErrors();
}

function switchAuthTab(tab) {
    var isLogin = (tab === 'login');
    document.getElementById('authPanelLogin').style.display    = isLogin ? 'block' : 'none';
    document.getElementById('authPanelRegister').style.display = isLogin ? 'none'  : 'block';
    document.getElementById('tabLogin').classList.toggle('active',    isLogin);
    document.getElementById('tabRegister').classList.toggle('active', !isLogin);
    clearAuthErrors();
}

function clearAuthErrors() {
    ['loginError', 'regError'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) { el.textContent = ''; el.classList.remove('visible'); }
    });
}

function showAuthError(id, msg) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.classList.add('visible');
}

function doRegister() {
    var username = document.getElementById('regUsername').value.trim();
    var email    = document.getElementById('regEmail').value.trim();
    var password = document.getElementById('regPassword').value;

    if (!username) { showAuthError('regError', 'Choose a display name.'); return; }
    if (!email)    { showAuthError('regError', 'Enter your email.');       return; }
    if (password.length < 6) { showAuthError('regError', 'Password must be at least 6 characters.'); return; }

    var btn = document.getElementById('regBtn');
    btn.disabled = true;
    btn.textContent = 'Creating\u2026';

    auth.createUserWithEmailAndPassword(email, password)
        .then(function (cred) {
            return cred.user.updateProfile({ displayName: username });
        })
        .then(function () {
            var uid = auth.currentUser.uid;
            return db.ref('users/' + uid).set({
                username: username,
                email:    email,
                joinedAt: firebase.database.ServerValue.TIMESTAMP
            });
        })
        .catch(function (err) {
            showAuthError('regError', friendlyAuthError(err.code));
            btn.disabled = false;
            btn.textContent = 'Create account';
        });
}

function doLogin() {
    var email    = document.getElementById('loginEmail').value.trim();
    var password = document.getElementById('loginPassword').value;

    if (!email)    { showAuthError('loginError', 'Enter your email.');    return; }
    if (!password) { showAuthError('loginError', 'Enter your password.'); return; }

    var btn = document.getElementById('loginBtn');
    btn.disabled = true;
    btn.textContent = 'Signing in\u2026';

    auth.signInWithEmailAndPassword(email, password)
        .catch(function (err) {
            showAuthError('loginError', friendlyAuthError(err.code));
            btn.disabled = false;
            btn.textContent = 'Sign in';
        });
}

function signOut() {
    auth.signOut().then(function () {
        showToast('Signed out.');
    });
}


function friendlyAuthError(code) {
    var map = {
        'auth/email-already-in-use':    'That email is already registered.',
        'auth/invalid-email':           'That email address is invalid.',
        'auth/weak-password':           'Password is too weak.',
        'auth/user-not-found':          'No account found with that email.',
        'auth/wrong-password':          'Incorrect password.',
        'auth/invalid-credential':      'Incorrect email or password.',
        'auth/too-many-requests':       'Too many attempts. Try again later.',
        'auth/network-request-failed':  'Network error. Check your connection.'
    };
    return map[code] || 'Something went wrong. Please try again.';
}


var BLOCKED_WORDS = [
    'spamword1', 'spamword2', 'slur1', 'slur2'
];
var MAX_LINKS = 3;
var MIN_LENGTH = 3;

function moderateText(body) {
    var text = body.toLowerCase();

    var hitWord = BLOCKED_WORDS.filter(function (w) { return text.indexOf(w.toLowerCase()) !== -1; })[0];
    if (hitWord) {
        return { flagged: true, reason: 'Contains blocked term ("' + hitWord + '")' };
    }

    var linkMatches = text.match(/https?:\/\/\S+/g) || [];
    if (linkMatches.length > MAX_LINKS) {
        return { flagged: true, reason: 'Too many links (' + linkMatches.length + ')' };
    }

    if (body.trim().length < MIN_LENGTH) {
        return { flagged: true, reason: 'Comment too short / empty' };
    }

    var letters = text.replace(/[^a-z]/gi, '');
    if (letters.length > 20) {
        var upperRatio = body.replace(/[^A-Z]/g, '').length / Math.max(1, body.replace(/[^a-zA-Z]/g, '').length);
        if (upperRatio > 0.7) {
            return { flagged: true, reason: 'Excessive capitalization' };
        }
    }

    return { flagged: false, reason: null };
}

document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeAuthModal();
});

document.getElementById('postBody').addEventListener('input', function () {
    document.getElementById('charCount').textContent = this.value.length + ' / 1800';
});

function submitPost() {
    if (!currentUser) { openAuthModal('login'); return; }

    var author = getUserDisplayName(currentUser);
    var body   = document.getElementById('postBody').value.trim();

    if (!body) { showToast('Your comment is empty.'); return; }

    var btn = document.getElementById('submitPostBtn');
    btn.disabled = true;
    btn.textContent = 'Posting\u2026';

    var mod = moderateText(body);

    commentsRef.push({
        author:   author,
        uid:      currentUser.uid,
        body:     body,
        score:    0,
        replies:  0,
        status:   mod.flagged ? 'flagged' : 'approved',
        moderation: {
            flagged:   mod.flagged,
            reason:    mod.reason,
            checkedAt: firebase.database.ServerValue.TIMESTAMP,
            automatic: true
        },
        ts:       firebase.database.ServerValue.TIMESTAMP
    }, function (err) {
        if (err) {
            showToast('Failed to post. Check your connection.');
        } else {
            document.getElementById('postBody').value    = '';
            document.getElementById('charCount').textContent = '0 / 1800';
            showToast(mod.flagged ? 'Your comment was flagged for review.' : 'Comment posted!');
        }
        btn.disabled = false;
        btn.textContent = 'Comment';
    });
}

commentsRef.on('value', function (snapshot) {
    allComments = snapshot.val() || {};
    renderComments();
});


function attachUserVotesListener() {
    if (!currentUser) return;
    detachUserVotesListener();
    userVotesRef = db.ref('toolkit/votes/' + pageId + '/' + currentUser.uid);
    userVotesRef.on('value', function (snap) {
        userVotes = snap.val() || {};
        renderComments();
    });
}

function detachUserVotesListener() {
    if (userVotesRef) {
        userVotesRef.off();
        userVotesRef = null;
    }
    userVotes = {};
}

function setSort(sort, btn) {
    currentSort = sort;
    document.querySelectorAll('.sort-btn').forEach(function (b) { b.classList.remove('active'); });
    btn.classList.add('active');
    renderComments();
}

function renderComments() {
    var container = document.getElementById('commentList');
    if (!container) return;

    var entries = Object.keys(allComments)
        .map(function (id) { return { id: id, data: allComments[id] }; })
        .filter(function (e) { return e.data.status === 'approved'; });

    if (currentSort === 'new') {
        entries.sort(function (a, b) { return (b.data.ts || 0) - (a.data.ts || 0); });
    } else {
        entries.sort(function (a, b) { return (b.data.score || 0) - (a.data.score || 0); });
    }

    document.getElementById('commentCountLabel').textContent =
        entries.length + (entries.length === 1 ? ' comment' : ' comments');

    if (entries.length === 0) {
        container.innerHTML =
            '<div class="comment-empty">' +
            '<div class="comment-empty-icon">&#128172;</div>' +
            '<p>No comments yet. Be the first to say something.</p>' +
            '</div>';
        return;
    }

    Object.keys(replyListeners).forEach(function (pid) {
        db.ref('toolkit/replies/' + pageId + '/' + pid).off('value', replyListeners[pid]);
    });
    replyListeners = {};

    var html = '';
    entries.forEach(function (e) { html += buildCommentHTML(e.id, e.data); });
    container.innerHTML = html;

    // Re-open any panels that were open before the re-render
    Object.keys(openReplies).forEach(function (pid) {
        if (openReplies[pid]) {
            var panel = document.getElementById('replies-' + pid);
            if (panel) { panel.classList.add('open'); loadReplies(pid); }
        }
    });
}

function buildCommentHTML(id, comment) {
    var preview    = (comment.body || '');
    var timeStr    = comment.ts ? formatTime(comment.ts) : '';
    var replyCount = comment.replies || 0;
    var myVote     = userVotes[id] || 0;

    var replyArea;
    if (currentUser) {
        replyArea =
            '<div class="reply-compose">' +
                '<input type="text" id="reply-input-' + id + '" placeholder="Your reply\u2026" maxlength="600" />' +
                '<button class="reply-send" onclick="submitReply(\'' + id + '\')">Reply</button>' +
            '</div>';
    } else {
        replyArea =
            '<div class="reply-gate">' +
                '<span>Sign in to reply.</span>' +
                '<button onclick="openAuthModal(\'login\')">Sign in</button>' +
            '</div>';
    }

    return (
        '<div class="comment-item" id="post-' + id + '">' +

            '<div class="vote-col">' +
                '<button class="vote-btn' + (myVote === 1 ? ' active' : '') + '" onclick="vote(\'' + id + '\', 1)" title="Upvote">&#9650;</button>' +
                '<span class="vote-score" id="score-' + id + '">' + (comment.score || 0) + '</span>' +
                '<button class="vote-btn' + (myVote === -1 ? ' active' : '') + '" onclick="vote(\'' + id + '\', -1)" title="Downvote">&#9660;</button>' +
            '</div>' +

            '<div class="comment-body">' +
                '<p class="comment-text">' + escHtml(preview) + '</p>' +
                '<div class="comment-meta">' +
                    '<span class="comment-author">' + escHtml(comment.author || 'Anonymous') + '</span>' +
                    '<span>' + escHtml(timeStr) + '</span>' +
                    '<button class="reply-toggle" onclick="toggleReplies(\'' + id + '\')">' +
                        'Replies (' + replyCount + ')' +
                    '</button>' +
                '</div>' +

                '<div class="replies-panel" id="replies-' + id + '">' +
                    '<div id="reply-list-' + id + '"><div class="loading-text">Loading\u2026</div></div>' +
                    replyArea +
                '</div>' +
            '</div>' +

        '</div>'
    );
}

function toggleReplies(pid) {
    var panel = document.getElementById('replies-' + pid);
    if (!panel) return;

    if (panel.classList.contains('open')) {
        panel.classList.remove('open');
        openReplies[pid] = false;
        if (replyListeners[pid]) {
            db.ref('toolkit/replies/' + pageId + '/' + pid).off('value', replyListeners[pid]);
            delete replyListeners[pid];
        }
    } else {
        panel.classList.add('open');
        openReplies[pid] = true;
        loadReplies(pid);
    }
}

function loadReplies(pid) {
    var ref = db.ref('toolkit/replies/' + pageId + '/' + pid);
    replyListeners[pid] = ref.on('value', function (snap) {
        var list = document.getElementById('reply-list-' + pid);
        if (!list) return;

        var replies = snap.val();
        var arr = replies
            ? Object.keys(replies)
                .map(function (k) { return replies[k]; })
                .filter(function (r) { return r.status === 'approved'; })
            : [];

        if (arr.length === 0) {
            list.innerHTML = '<p class="loading-text" style="padding:0 0 10px;text-align:left;">No replies yet.</p>';
            return;
        }

        arr.sort(function (a, b) { return (a.ts || 0) - (b.ts || 0); });

        var html = '';
        arr.forEach(function (r) {
            html +=
                '<div class="reply-item">' +
                    '<div class="reply-meta">' +
                        '<span class="reply-author">' + escHtml(r.author || 'Anonymous') + '</span>' +
                        ' &#183; ' + escHtml(formatTime(r.ts)) +
                    '</div>' +
                    '<p class="reply-text">' + escHtml(r.text || '') + '</p>' +
                '</div>';
        });
        list.innerHTML = html;
    });
}

function submitReply(pid) {
    if (!currentUser) { openAuthModal('login'); return; }

    var input = document.getElementById('reply-input-' + pid);
    if (!input) return;

    var text = input.value.trim();
    if (!text) { showToast('Write something first.'); return; }

    var mod = moderateText(text);

    db.ref('toolkit/replies/' + pageId + '/' + pid).push({
        author: getUserDisplayName(currentUser),
        uid:    currentUser.uid,
        text:   text,
        status: mod.flagged ? 'flagged' : 'approved',
        moderation: {
            flagged:   mod.flagged,
            reason:    mod.reason,
            checkedAt: firebase.database.ServerValue.TIMESTAMP,
            automatic: true
        },
        ts:     firebase.database.ServerValue.TIMESTAMP
    }, function (err) {
        if (!err) {
            input.value = '';
            db.ref('toolkit/comments/' + pageId + '/' + pid + '/replies').transaction(function (cur) {
                return (cur || 0) + 1;
            });
            showToast(mod.flagged ? 'Reply flagged for review.' : 'Reply posted!');
        } else {
            showToast('Failed to post reply.');
        }
    });
}

function vote(pid, delta) {
    if (!currentUser) { openAuthModal('login'); return; }

    var existing = userVotes[pid] || 0;
    var next     = (existing === delta) ? 0 : delta; // click same arrow again → undo

    var voteRef  = db.ref('toolkit/votes/' + pageId + '/' + currentUser.uid + '/' + pid);
    var scoreRef = db.ref('toolkit/comments/' + pageId + '/' + pid + '/score');

    var write = (next === 0) ? voteRef.remove() : voteRef.set(next);

    write.then(function () {
        return scoreRef.transaction(function (cur) {
            return (cur || 0) + (next - existing);
        });
    }).catch(function () {
        showToast('Could not save your vote.');
    });
}

function escHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function formatTime(ts) {
    if (!ts) return '';
    var now  = Date.now();
    var diff = Math.floor((now - ts) / 1000);
    if (diff < 60)    return 'just now';
    if (diff < 3600)  return Math.floor(diff / 60)   + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600)  + 'h ago';
    var d = new Date(ts);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function showToast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(function () { t.classList.remove('show'); }, 3200);
}
