// ==UserScript==
// @name         Monstercat Player
// @namespace    https://www.monstercat.com/
// @version      0.1
// @description  Events and code to hook into the Monstercat Player
// @author       Sekwah
// @match        https://www.monstercat.com/player*
// @grant        none
// @require      https://code.jquery.com/jquery-3.5.1.min.js
// @updateURL    https://github.com/sekwah41/Monstercat-Player-Overlay/raw/main/monstercat-player-overlay.user.js
// @downloadURL  https://github.com/sekwah41/Monstercat-Player-Overlay/raw/main/monstercat-player-overlay.user.js
// ==/UserScript==
/* globals $, webpackJsonp_N_E */

(() => {
    'use strict';

    /**
     * Hook into the monstercat toast notification system
     */
    let toast;

    let enabled = false;

    let currentPlayingStatus = {
        playing: false,
        song: {
            name: "",
            artists: [],
            art: "none",
        }
    };

    // May wanna set that up later
    let currentProgress = {
        time: 0,
        total: 0,
    };

    function injectIntoWebpack() {

        // This is to force webpack into running our code and make other modules available to us
        window.webpackJsonp_N_E.push([[69], {
            "oVeR": (function(module, exports, __webpack_require__) {

                try {
                    toast = __webpack_require__("hUol");

                    toast.info("Injection has been successful :)", "Stream Overlay");

                    clearInterval(loopCheckRef);
                    setupAddon();
                }
                catch(e) {
                    console.log("Issue trying to initialise, retrying soon.")
                }
            })
        }, [['oVeR']]]);
    }

    function setupAddon() {
        if(enabled) return;
        enabled = true;

        setInterval(checkCurrentPlayingStatus, 100);
    }

    function checkCurrentPlayingStatus() {
        let playButton = $('.btn.play-pause').find('i');
        let isPlaying = playButton.hasClass("fa-pause") || playButton.hasClass("fa-spin");
        let songName = $('.song-info').find('.song-title').text();
        let artists = $('.song-info').find('.artists-list').find('a').toArray().map(a => $(a).text());
        let albumArt = $('.active-song').find('.album-art').css('background-image').replace('url("','').replace('")','');

        let timeStamp = $('.active-song-time').text().split('/').map(a => a.trim().split(':'));

        if(timeStamp[1][0] !== "NaN") {
            let progress = {
                time: (parseInt(timeStamp[0][0]) * 60 + parseInt(timeStamp[0][1])),
                total: (parseInt(timeStamp[1][0]) * 60 + parseInt(timeStamp[1][1]))
            }
            if(progress.time !== currentProgress.time || progress.total !== currentProgress.total) {
                updateProgress(progress);
            }
        }

        let newPlayingStatus = {
            playing: isPlaying,
            song: {
                name: songName,
                artists: artists,
                art: albumArt,
            }
        };

        if(albumArt !== "none" && JSON.stringify(newPlayingStatus) !== JSON.stringify(currentPlayingStatus)) {
            songChange(newPlayingStatus);
        }

    }

    function updateProgress(progress) {

        currentProgress = progress;

        $.ajax({type: "POST",
            url: "http://localhost:8080/song/progress",
            dataType: 'json',
            contentType: "application/json",
            async: false,
            data: JSON.stringify( {
                time: progress.time * 1000,
                total: progress.total * 1000,
            })
        });
    }

    /**
     * Fire the code whenever the song changes
     * @param songDetails
     */
    function songChange(playingStatus) {
        currentPlayingStatus = playingStatus;

        $.ajax({type: "POST",
            url: "http://localhost:8080/song/change",
            dataType: 'json',
            contentType: "application/json",
            async: false,
            data: JSON.stringify( {
                    playing: playingStatus.playing,
                    name: playingStatus.song.name,
                    img: playingStatus.song.art,
                    artist: playingStatus.song.artists.join(", "),
                    platform: "Monstercat",
                })
        });

        toast.info(`New song detected</br>
                    Song: ${playingStatus.song.name}</br>
                    Artist: ${playingStatus.song.artists.join(", ")}`, "Song change");

    }

    let loopCheckRef;
    let loopCheck = () => {
        if(window.webpackJsonp_N_E) {
            injectIntoWebpack();
        }
    }

    $(document).ready(function () {
        // May not fully be needed but seems to do a decent job :D
        loopCheckRef = setInterval(loopCheck, 1000);

    });

})();
