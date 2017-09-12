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

var script = "script";
var snippets = "https://24l1khds95.execute-api.us-east-1.amazonaws.com/prod/";
var defaultProg = `package main

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

function setButtonsDisabled(value) {
    let buttons = document.querySelectorAll(".btn");
    for (let button of buttons) {
        button.disabled = value;
    }
}

function init() {
    Go.RedirectConsole(function (l) {
        var e = document.getElementById("console");
        e.innerHTML = e.innerHTML + l;
    })
    var el = document.querySelector("div.pg-editor")
    var editor = ace.edit(el);
    editor.$blockScrolling = Infinity;
    editor.setTheme("ace/theme/sqlserver");
    editor.getSession().setMode("ace/mode/golang");

    setButtonsDisabled(true);
    if (window.location.hash) {
        var hash = window.location.hash.replace("#","");
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

    let fontSize = parseInt(getCookie("fontsize"), 10);
    if (fontSize === 0) {
        fontSize = 16;
    }
    document.querySelector('.pg-fontsize').value = fontSize;
    editor.setFontSize(fontSize);

    document.querySelector(".pg-fontsize").addEventListener("change", (e) => {
        e.preventDefault()
        var size = +(document.querySelector(".pg-fontsize").value);
        editor.setFontSize(size);
        setCookie("fontsize",size,365);
    });

    document.querySelector(".pg-format").addEventListener("click", (e) => {
        e.preventDefault();
        setButtonsDisabled(true);
        var src = editor.getValue();
        Go.Format(src, document.querySelector(".pg-imports").checked)
            .then(s => editor.setValue(s,-1))
            .then(() => {setButtonsDisabled(false);})
            .catch(err => {
                document.getElementById("console").textContent = err;
                setButtonsDisabled(false);
            })
    });

    document.querySelector(".pg-share").addEventListener("click", (e) => {
        e.preventDefault()
        var $share = document.querySelector(".pg-share");
        $share.disabled = true;
        fetch(`${snippets}`, {
            method: 'POST',
            body:   editor.getValue(),
        }).then(response => {
            return response.text();
        }).then(text => {
            location.hash = `#/${text}`;
            $share.disabled = false;
        }).catch(err => {
            document.getElementById("console").textContent = err;
        });
    });

    document.querySelector(".pg-run").addEventListener("click", (e) => {
        e.preventDefault();
        setButtonsDisabled(true);
        Go.Compile(editor.getValue())
            .then((src) => {
                document.getElementById("console").textContent = '';
                var $output = document.getElementById("output")
                while ($output.firstChild) {
                    $output.removeChild($output.firstChild);
                }
                let $div = document.createElement('div');
                $div.classList.add('embed-responsive');
                $div.classList.add('embed-responsive-4by3');
                // allowfullscreen
                var iframe = document.createElement('iframe');
                iframe.className = "embed-responsive-item";
                $div.appendChild(iframe);
                $output.appendChild($div)
                var doc = iframe.contentWindow.document;
                doc.open()
                doc.write(`
                <!DOCTYPE html>
                <html>
                <head>
                <${script}>
                if (top.goPrintToConsole) {
                    window.goPrintToConsole = top.goPrintToConsole;
                }
                </${script}>
                </head>
                <body>
                <${script}>
                ${src}
                </${script}>
                </body>
                </html>
                `)
                doc.close()
                setButtonsDisabled(false);
            })
            .catch((err) => {
                document.getElementById("console").textContent = err;
                setButtonsDisabled(false);
            });
    });
}

window.addEventListener('load', init);

function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    var expires = "expires="+ d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for(var i = 0; i <ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}
