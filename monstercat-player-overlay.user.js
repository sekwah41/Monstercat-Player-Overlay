// ==UserScript==
// @name         Monstercat Player
// @namespace    https://www.monstercat.com/
// @version      1.1
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

    let failedSending = false;

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

    function getPlayProps() {

    }

    function injectIntoWebpack() {

        // This is to force webpack into running our code and make other modules available to us
        window.webpackJsonp_N_E.push([[69], {
            "oVeR": (function (module, exports, __webpack_require__) {

                try {
                    toast = __webpack_require__("hUol");

                    toast.success("Injection has been successful :)", "Stream Overlay");

                    clearInterval(loopCheckRef);
                    setupAddon();
                } catch (e) {
                    console.log("Issue trying to initialise, retrying soon.")
                }
            })
        }, [['oVeR']]]);
    }

    function getSongInfo() {
        let playReactComponent = null;

        let possiblePlayBars = $('.buttons').toArray();
        for(let i of possiblePlayBars) {
            let playBar = i;
            let reactInternal = playBar[Object.keys((playBar)).find((detail) => {
                return detail.startsWith("__reactInternalInstance");
            })];

            playReactComponent = reactInternal.memoizedProps.children.find(child => {
                return child?.props?.className === "play-pause";
            });
        }

        let extraDetails = {
            link: null,
        };

        if(playReactComponent) {
            let songData = playReactComponent?.props?.song;
            let catalogueId = songData?.release?.catalogId;
            if(catalogueId) {
                extraDetails.link = `https://www.monstercat.com/release/${catalogueId}`;
            }
        }

        return extraDetails;
    }

    function setupAddon() {
        if (enabled) return;
        enabled = true;

        setInterval(checkCurrentPlayingStatus, 100);
    }

    function failedRequest() {
        if (!failedSending) {
            toast.error("Error communicating with overlay", "Stream Overlay");
            failedSending = true;
        }
    }

    function checkCurrentPlayingStatus() {
        let playButton = $('.btn.play-pause').find('i');
        let isPlaying = playButton.hasClass("fa-pause") || playButton.hasClass("fa-spin");
        let songInfo = $('.song-info');
        let songName = songInfo.find('.song-title').text();
        let artists = songInfo.find('.artists-list').find('a').toArray().map(a => $(a).text());
        let albumArt = $('.active-song').find('.album-art').css('background-image').replace('url("', '').replace('")', '');

        let timeStamp = $('.active-song-time').text().split('/').map(a => a.trim().split(':'));

        if (timeStamp[1][0] !== "NaN") {
            let progress = {
                time: (parseInt(timeStamp[0][0]) * 60 + parseInt(timeStamp[0][1])),
                total: (parseInt(timeStamp[1][0]) * 60 + parseInt(timeStamp[1][1]))
            }
            if (progress.time !== currentProgress.time || progress.total !== currentProgress.total) {
                updateProgress(progress);
            }
        }

        let {link} = getSongInfo();
        let newPlayingStatus = {
            playing: isPlaying,
            song: {
                name: songName,
                artists: artists,
                art: albumArt,
                link
            }
        };

        if (albumArt !== "none" && JSON.stringify(newPlayingStatus) !== JSON.stringify(currentPlayingStatus)) {
            songChange(newPlayingStatus);
        }

    }

    function updateProgress(progress) {

        currentProgress = progress;

        if (!failedSending) {
            $.ajax({
                type: "POST",
                url: "http://localhost:8080/song/progress",
                dataType: 'text',
                contentType: "application/json",
                async: true,
                data: JSON.stringify({
                    time: progress.time * 1000,
                    total: progress.total * 1000,
                })
            }).fail(failedRequest);
        }
    }

    /**
     * Fire the code whenever the song changes
     * @param songDetails
     */
    function songChange(playingStatus) {
        currentPlayingStatus = playingStatus;

        $.ajax({
            type: "POST",
            url: "http://localhost:8080/song/change",
            dataType: 'text',
            contentType: "application/json",
            async: true,
            data: JSON.stringify({
                playing: playingStatus.playing,
                name: playingStatus.song.name,
                img: playingStatus.song.art,
                link: playingStatus.song.link,
                artist: playingStatus.song.artists.join(", "),
                platform: "Monstercat",
            })
        }).done(() => {
            if (failedSending) {
                toast.success("Reconnected to overlay", "Stream Overlay");
                failedSending = false;
            }
        }).fail(failedRequest);

        if (!failedSending) {
            toast.info(`New song detected</br>
                    Song: ${playingStatus.song.name}</br>
                    Artist: ${playingStatus.song.artists.join(", ")}`, "Song change");
        }

    }

    let loopCheckRef;
    let loopCheck = () => {
        if (window.webpackJsonp_N_E) {
            injectIntoWebpack();
        }
    }

    $(document).ready(function () {
        // May not fully be needed but seems to do a decent job :D
        loopCheckRef = setInterval(loopCheck, 1000);

    });

})();
