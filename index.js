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
`
;
$(function () {
    Go.RedirectConsole(function (l) {
        var e = document.querySelector("#console");
        e.innerHTML = e.innerHTML + l;
    })
    var el = document.querySelector("div.pg-editor")
    var editor = ace.edit(el);
    editor.$blockScrolling = Infinity;
    editor.setTheme("ace/theme/sqlserver");
    editor.getSession().setMode("ace/mode/golang");
    window.Editor = editor;
    $(function () {
        $(".btn").prop('disabled', true);
        if (window.location.hash) {
            var hash = window.location.hash.replace("#","");
            $.get(`${snippets}${hash}`,function(d,x,r) {
                Editor.setValue(d,-1);
                Go.Compile(d)
            })
        } else {
            Editor.setValue(defaultProg,-1);
            Go.Compile(defaultProg).then(() => {$(".btn").prop('disabled', false);});
        }
        var fontsize = getCookie("fontsize");
        if (fontsize != "") {
            $(`.pg-fontsize option:contains("${fontsize}")`).prop('selected', true);
            editor.setFontSize(+fontsize);
        } else {
            $(`.pg-fontsize option:contains("16")`).prop('selected', true);
            editor.setFontSize(16);
        }
        $(".pg-fontsize").on("change",function(e) {
            e.preventDefault()
            var size = +($(".pg-fontsize :selected").text());
            editor.setFontSize(size);
            setCookie("fontsize",size,365);
        });
        $(".pg-format").on("click", function (e) {
            e.preventDefault();
            $(".btn").prop('disabled', true);
            var src = Editor.getValue();
            Go.Format(src, $(".pg-imports").prop("checked"))
                .then((s) => Editor.setValue(s,-1))
                .then(() => $(".btn").prop('disabled', false))
                .catch((err) => {
                    $("#console").text(err);
                    $(".btn").prop('disabled', false);
                })
        });
        $(".pg-share").on("click",function(e) {
            e.preventDefault()
            var $share = $(".pg-share");
            $share.prop('disabled',true);
            $.post(`${snippets}`,editor.getValue(),function(d,s,x) {
                if (x.status != 200) {
                    $("#console").text(s);
                } else { 
                location.hash = `#/${d}`;
                }
                $share.prop('disabled',false);
            });
        });
        $(".pg-run").on("click", function (e) {
            e.preventDefault();
            $(".btn").prop('disabled', true);
            Go.Compile(editor.getValue())
                .then((src) => {
                    $("#console").text("");
                    var $output = $("#output")
                    $output.empty();
                    $div = $(`<div class="embed-responsive embed-responsive-4by3"></div>`)
                    // allowfullscreen
                    var iframe = document.createElement('iframe');
                    iframe.className = "embed-responsive-item";
                    $div.append(iframe);
                    $output.append($div)
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
                    $(".btn").prop('disabled', false);
                })
                .catch((err) => {
                    $("#console").text(err);
                    $(".btn").prop('disabled', false);
                });
        });
    });
});

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