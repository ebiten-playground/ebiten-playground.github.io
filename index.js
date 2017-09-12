// Copyright 2017 The Ebiten Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

const snippets = 'https://24l1khds95.execute-api.us-east-1.amazonaws.com/prod/';
const defaultProg = `package main

import (
    "fmt"
    "github.com/gopherjs/gopherjs/js"
)

func main() {
    fmt.Println("Hai")
    doc := js.Global.Get("document")
    doc.Call("addEventListener","DOMContentLoaded",func() {
        fmt.Println("Loaded")
        doc.Get("body").Set("innerHTML","HAI")
    })
}
`;
const iframeDocument = `<!DOCTYPE html>
<html>
<head>
<script>
if (top.goPrintToConsole) {
    window.goPrintToConsole = top.goPrintToConsole;
}
</script>
</head>
<body>
</body>
</html>
`;

function setButtonsDisabled(value) {
    let buttons = document.querySelectorAll('.btn');
    for (let button of buttons) {
        button.disabled = value;
    }
}

function init() {
    Go.RedirectConsole(function (l) {
        let e = document.getElementById('console');
        e.innerHTML = e.innerHTML + l;
    })
    let el = document.getElementById('pg-editor')
    let editor = ace.edit(el);
    editor.$blockScrolling = Infinity;
    editor.setTheme('ace/theme/sqlserver');
    editor.getSession().setMode('ace/mode/golang');

    setButtonsDisabled(true);
    if (window.location.hash) {
        let hash = window.location.hash.substring(1);
        fetch(`${snippets}${hash}`).then(response => {
            return response.text();
        }).then(text => {
            editor.setValue(text, -1);
            Go.Compile(text).then(() => {
                setButtonsDisabled(false);
            })
        });
    } else {
        editor.setValue(defaultProg, -1);
        Go.Compile(defaultProg).then(() => {
            setButtonsDisabled(false);
        });
    }

    let fontSize = parseInt(getCookie('fontsize'), 10);
    if (fontSize === 0) {
        fontSize = 16;
    }
    document.getElementById('pg-fontsize').value = fontSize;
    editor.setFontSize(fontSize);

    document.getElementById('pg-fontsize').addEventListener('change', (e) => {
        e.preventDefault()
        let size = +(document.getElementById('pg-fontsize').value);
        editor.setFontSize(size);
        setCookie('fontsize',size,365);
    });

    document.getElementById('pg-format').addEventListener('click', (e) => {
        e.preventDefault();
        setButtonsDisabled(true);
        let src = editor.getValue();
        Go.Format(src, document.getElementById('pg-imports').checked)
            .then(s => editor.setValue(s,-1))
            .then(() => {setButtonsDisabled(false);})
            .catch(err => {
                document.getElementById('console').textContent = err;
                setButtonsDisabled(false);
            })
    });

    document.getElementById('pg-share').addEventListener('click', (e) => {
        e.preventDefault()
        let share = document.getElementById('pg-share');
        share.disabled = true;
        fetch(`${snippets}`, {
            method: 'POST',
            body:   editor.getValue(),
        }).then(response => {
            return response.text();
        }).then(text => {
            location.hash = `#/${text}`;
            share.disabled = false;
        }).catch(err => {
            document.getElementById('console').textContent = err;
        });
    });

    document.getElementById('pg-run').addEventListener('click', (e) => {
        e.preventDefault();
        setButtonsDisabled(true);
        Go.Compile(editor.getValue())
            .then((src) => {
                document.getElementById('console').textContent = '';
                let output = document.getElementById('output')
                while (output.firstChild) {
                    output.removeChild(output.firstChild);
                }
                let div = document.createElement('div');
                div.classList.add('embed-responsive');
                div.classList.add('embed-responsive-4by3');
                // allowfullscreen
                let iframe = document.createElement('iframe');
                iframe.className = 'embed-responsive-item';
                div.appendChild(iframe);
                output.appendChild(div)
                let doc = iframe.contentWindow.document;
                doc.open();
                doc.write(iframeDocument)
                let script = doc.createElement('script');
                script.textContent = src;
                doc.body.appendChild(script);
                doc.close()
                setButtonsDisabled(false);
            })
            .catch((err) => {
                document.getElementById('console').textContent = err;
                setButtonsDisabled(false);
            });
    });
}

window.addEventListener('load', init);

function setCookie(cname, cvalue, exdays) {
    let d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    let expires = 'expires='+ d.toUTCString();
    document.cookie = cname + '=' + cvalue + ';' + expires + ';path=/';
}

function getCookie(cname) {
    let name = cname + '=';
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(';');
    for(let i = 0; i <ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return '';
}
