//Adam Epstein and David Schonfeld


/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

 console.log("starting index.js")

 var SCAN_TIME = 7000;           // Scan for 7 seconds
 var CONNECTION_TIMEOUT = 7000;  // Wait for 7 seconds for a valid connection

 // *********   Global variables used for all IDs that are used in multiple functions
 var refreshDevicesModal = null;
 var connectingModal = null;
 var deviceList = null;
 var deviceObjectMap = null;
 var pageNavigator = null;
 var connectingDevice = null;
 var connectionTimeout = null;

 var lampService        = "52162a8a-a80e-4901-855c-cb354f79ee14";
 var onCharacteristic = "FF00";
 var rgbCharacteristic = "FF01";
 var defaultCharacteristic = "FF02";
 var offInCharacteristic = "FF03";
 var onInCharacteristic = "FF04";
 var onNowCharacteristic = "FF05";
 var onAtCharacteristic = "FF06";
 var offAtCharacteristic = "FF07";
 var setTimeCharacteristic = "FF08";

 var onTab = false;
 var colorTab = false;
 var timeTab = false;

 // *********   Functions for scanning and scan related events

 function scanFailed() {
     refreshDevicesModal.hide();
 }

 function scanStop() {
     ble.stopScan();
     refreshDevicesModal.hide();
 }

 function deviceDiscovered(device) {
     // Debugging: Console log of details of item
     // console.log(JSON.stringify(device));

     if(deviceObjectMap.get(device.id) == undefined ) {
         // New Device. Add it to the collection and to the window
         deviceObjectMap.set(device.id, device);

         // Identify the name or use a default
         var name = "(none)";
         if (device.name != undefined) {
             name = device.name;
         }

         // Create the Onsen List Item
         var item = ons._util.createElement('<ons-list-item modifier="chevron" tappable> ' +
             '<ons-row><ons-col><span class="list-item__title" style="font-size: 4vw;">' + device.id + '</span></ons-col></ons-row>' +
             '<ons-row><ons-col><span class="list-item__subtitle" style="font-size: 2vw;">RSSI:' + device.rssi + '</span></ons-col><ons-col><span style="font-size: 2vw;">Name: ' + name + '</span></ons-col></ons-row>' +
             '</ons-list-item>');

         // Set the callback function
         item.addEventListener('click', deviceSelected, false);

         // Associate the element in the list with the object
         item.device = device;

         // Iterate through the list and add item in place by RSSI
         var descendants = deviceList.getElementsByTagName('ons-list-item');
         var i;
         for(i=0;i<descendants.length;i++) {
             if(device.rssi > descendants[i].device.rssi) {
                 descendants[i].parentNode.insertBefore(item, descendants[i]);
                 return;
             }
         }
         // If it hasn't already returned, it wasn't yet inserted.
         deviceList.append(item);
     }
 }

 function startScan() {
     // Disable the window
     refreshDevicesModal.show();

     // Empty the list (on screen and Map)
     deviceList.innerHTML = "";
     deviceObjectMap = new Map();

     // Start the scan
     ble.scan([], SCAN_TIME, deviceDiscovered, scanFailed);

     // Re-enable the window when scan done
     setTimeout(scanStop, SCAN_TIME);
 }

 //Tab Functions

 function noTab(){
   onTab = false;
   colorTab = false;
   timeTab = false;
 }

 function onTabPressed(){
   noTab();
   onTab = true;
   readOn();
   readRGB();
 }

 function colorTabPressed(){
   noTab();
   colorTab = true;
   readRGB();
   readDefault();
 }

 function timeTabPressed(){
   noTab();
   timeTab = true;
   //Insert time reading functions here.
    console.log("-----timeTabPressed-----");
  readTimeInOnLeft();
  readTimeInOffLeft();
   readTimeOnLeft();
   readTimeOffLeft();
   readCurrentTime();
    console.log("-----timeTabPressed-functions done-----");
 }


 var messageCounter = 0;

 // ***** Button Related Functions ********
 function onData(buffer) {
   console.log("OnData");
   if(onTab){
     var array = new Uint8Array(buffer);
     var fadeSwitch = document.getElementById("fadeSwitch");
     var nowSwitch = document.getElementById("nowSwitch");
     fadeSwitch.checked =  (array[0] != 0);
     nowSwitch.checked =  (array[0] != 0);
   }
 }

 function rgbData(buffer){
   console.log("rgbData");
   var array = new Uint8Array(buffer);
   var r = array[0];
   var g = array[1];
   var b = array[2];
   console.log(array);
   if(onTab){
     var rOutput = document.getElementById("currentR");
     var gOutput = document.getElementById("currentG");
     var bOutput = document.getElementById("currentB");

     rOutput.innerHTML = round(r/2.55);
     gOutput.innerHTML = round(g/2.55);
     bOutput.innerHTML = round(b/2.55);


   }
   if(colorTab){

     var rOutput = document.getElementById("newR");
     var gOutput = document.getElementById("newG");
     var bOutput = document.getElementById("newB");

     rOutput.value = round(r/2.55);
     gOutput.value = round(g/2.55);
     bOutput.value = round(b/2.55);

   }
 }

 function defaultData(buffer){
   console.log("defaultData");

   var array = new Uint8Array(buffer);
   var r = array[0];
   var g = array[1];
   var b = array[2];
   console.log(array);
   if(colorTab){

     var rOutput = document.getElementById("defaultR");
     var gOutput = document.getElementById("defaultG");
     var bOutput = document.getElementById("defaultB");

     rOutput.value = round(r/2.55);
     gOutput.value = round(g/2.55);
     bOutput.value = round(b/2.55);

   }

 }

 function fadeSuccess(){
   console.log("fade was a success");
 }
 function fadeError(){
   console.log("fade was an error");
 }

 //Insert time based reading functions here
function timeLeftOn_afterFx(buffer){
  if(!timeTab){return;}

  var array = new Uint8Array(buffer);
  //console.log("timeLeftOn_afterFx: array's value: "+array);


  var numSeconds = array[3] + (array[2] << 8) + (array[1] << 16) + (array[0] <<  24);


  var numHours = Math.floor(numSeconds/3600);
  numSeconds = numSeconds % 3600;

  var numMinutes = Math.floor(numSeconds/60);
  numSeconds = numSeconds % 60;

  //console.log("numHours: "+numHours);
  //console.log("numMinutes: "+numMinutes);
  //console.log("numSeconds: "+numSeconds);

  document.getElementById("onHours").value = numHours;
  document.getElementById("onMinutes").value = numMinutes;
  document.getElementById("onSeconds").value = numSeconds;
}
function timeLeftOff_afterFx(buffer){
  if(!timeTab){return;}
  var array = new Uint8Array(buffer);
  console.log("timeLeftOff_afterFx: array's value: "+array);
  var numSeconds = array[3] + (array[2] << 8) + (array[1] << 16) + (array[0] <<  24);


  var numHours = Math.floor(numSeconds/3600);
  numSeconds = numSeconds % 3600;

  var numMinutes = Math.floor(numSeconds/60);
  numSeconds = numSeconds % 60;

  //console.log("numHours: "+numHours);
  //console.log("numMinutes: "+numMinutes);
  //console.log("numSeconds: "+numSeconds);

  document.getElementById("offHours").value = numHours;
  document.getElementById("offMinutes").value = numMinutes;
  document.getElementById("offSeconds").value = numSeconds;
}


 function timeReadOnTimer_afterFx(buffer){
  if(!timeTab){return;}
  var array = new Uint8Array(buffer);


  console.log("onTimerAt, onAtHours: "+array[0]);
  console.log("onTimerAt, onAtMinutes: "+array[1]);
  console.log("onTimerAt, onAtSeconds: "+array[2]);

  document.getElementById("onAtHours").value = array[0];
  document.getElementById("onAtMinutes").value = array[1];
  document.getElementById("onAtSeconds").value = array[2];

 }
 function timeReadOffTimer_afterFx(buffer){
  if(!timeTab){return;}
  var array = new Uint8Array(buffer);

  console.log("offTimerAt, offAtHours: "+array[0]);
  console.log("offTimerAt, offAtMinutes: "+array[1]);
  console.log("offTimerAt, offAtSeconds: "+array[2]);


  document.getElementById("offAtHours").value = array[0];
  document.getElementById("offAtMinutes").value = array[1];
  document.getElementById("offAtSeconds").value = array[2];

 }

 function timeReadNow_afterFx(buffer){
  //console.log("timeReadNow_afterFx, buffer: "+buffer)
  if(!timeTab){return;}
  var array = new Uint8Array(buffer);
  console.log("timeLeftOff_afterFx: array's value: "+array);
  var numSeconds = array[3] + (array[2] << 8) + (array[1] << 16) + (array[0] <<  24);

  var theDate = new Date(numSeconds*1000);

  console.log("theDate.getMonth(): "+theDate.getMonth());
  console.log("theDate.getDate(): "+theDate.getDate());
  console.log("theDate.getFullYear(): "+theDate.getFullYear());

  console.log("theDate.getHours(): "+theDate.getHours());
  console.log("theDate.getMinutes(): "+theDate.getMinutes());
  console.log("theDate.getSeconds(): "+theDate.getSeconds());

  document.getElementById("currentTime_month").innerHTML = theDate.getMonth()+1;
  document.getElementById("currentTime_day").innerHTML = theDate.getDate();
  document.getElementById("currentTime_year").innerHTML = theDate.getFullYear();
  document.getElementById("currentTime_hours").innerHTML = theDate.getHours();
  document.getElementById("currentTime_minutes").innerHTML = theDate.getMinutes();
  document.getElementById("currentTime_seconds").innerHTML = theDate.getSeconds();
 }


 function fadeSwitched(){
   console.log("fadeSwitched");
   var fadeSwitch = document.getElementById("fadeSwitch");
   var nowSwitch = document.getElementById("nowSwitch");
   var array = new Uint8Array(1);
   array[0] = fadeSwitch.checked;

   nowSwitch.checked = fadeSwitch.checked;

   ble.write(connectingDevice.id, lampService, onCharacteristic, array.buffer, fadeSuccess, fadeError);
   console.log("after write");
 }

  function nowSwitched(){
    console.log("nowSwitched");
    var fadeSwitch = document.getElementById("fadeSwitch");
    var nowSwitch = document.getElementById("nowSwitch");
    var array = new Uint8Array(1);
    array[0] = nowSwitch.checked;
    fadeSwitch.checked = nowSwitch.checked;
    ble.write(connectingDevice.id, lampService, onNowCharacteristic, array.buffer, fadeSuccess, fadeError);
  }

  function setDefault(){
    console.log("setting default");
    var rOutput = document.getElementById("defaultR");
    var gOutput = document.getElementById("defaultG");
    var bOutput = document.getElementById("defaultB");

    var array = new Uint8Array(3);
    array[0] = rOutput.value *2.55;
    array[1] = gOutput.value *2.55;
    array[2] = bOutput.value *2.55;

    ble.write(connectingDevice.id, lampService, defaultCharacteristic, array.buffer);
  }

  function newColor(){
    var rOutput = document.getElementById("newR");
    var gOutput = document.getElementById("newG");
    var bOutput = document.getElementById("newB");

    var array = new Uint8Array(3);
    array[0] = rOutput.value *2.55;
    array[1] = gOutput.value *2.55;
    array[2] = bOutput.value *2.55;

    ble.write(connectingDevice.id, lampService, rgbCharacteristic, array.buffer);
  }

  //Insert time based writing functions here.

 function buttonDataFailed() {
     console.log("Button Read Failed");
 }

 function readOn() {
     ble.read(connectingDevice.id, lampService, onCharacteristic, onData);
 }
 function readRGB() {
     ble.read(connectingDevice.id, lampService, rgbCharacteristic, rgbData);
 }
 function readDefault() {
     ble.read(connectingDevice.id, lampService, defaultCharacteristic, defaultData);
 }
function readTimeInOnLeft(){
  ble.read(connectingDevice.id, lampService, onInCharacteristic,timerLeftOn_afterFx);
}
function readTimeInOffLeft(){
  ble.read(connectingDevice.id, lampService, offInCharacteristic,timeLeftOff_afterFx);
}
function readTimeOnLeft(){
  ble.read(connectingDevice.id, lampService, onAtCharacteristic,timeReadOnTimer_afterFx);
}
function readTimeOffLeft(){
  ble.read(connectingDevice.id, lampService, offAtCharacteristic,timeReadOffTimer_afterFx);
}
function readCurrentTime(){
  ble.read(connectingDevice.id, lampService, setTimeCharacteristic,timeReadNow_afterFx);
}

 function round(num){
  return Math.round(num * 100) / 100;
 }



function setOnIn(){
  //console.log("clicked setOnIn");
  var on_hours = parseInt(document.getElementById("onHours").value);
  //console.log("read onHours empty successfully");
  var on_minutes = parseInt(document.getElementById("onMinutes").value);
  var on_seconds = parseInt(document.getElementById("onSeconds").value);
  if (on_hours == ""){on_hours = 0;}
  if (on_minutes == ""){on_minutes = 0;}

  var on_total_seconds = (60*60*on_hours)+(60*on_minutes)+on_seconds;
  //console.log("on_seconds: "+on_seconds);
  //console.log("on_minutes: "+on_minutes);
  //console.log("on_hours: "+on_hours);
  //console.log("on_total_seconds: "+on_total_seconds);

  //The following few lines of code to convert from int to byte array are from: https://stackoverflow.com/questions/15761790/convert-a-32bit-integer-into-4-bytes-of-data-in-javascript
  //Except we used Uint32Array
  var theByteArrayToSend = new Uint8Array([
      (on_total_seconds & 0xff000000) >> 24,
      (on_total_seconds & 0x00ff0000) >> 16,
      (on_total_seconds & 0x0000ff00) >> 8,
      (on_total_seconds & 0x000000ff)
   ]);
  // console.log("theByteArrayToSend: ");
  // console.log(theByteArrayToSend);

  //var theByteArrayToSend = new Uint8Array([0,0,0,on_total_seconds]);

  console.log(theByteArrayToSend);

  ble.write(connectingDevice.id, lampService, onInCharacteristic, theByteArrayToSend.buffer);

}
function setOffIn(){
  console.log("clicked setOffIn");
  var off_hours = parseInt(document.getElementById("offHours").value);
  var off_minutes = parseInt(document.getElementById("offMinutes").value);
  var off_seconds = parseInt(document.getElementById("offSeconds").value);
  if (off_hours == ""){off_hours = 0;}
  if (off_minutes == ""){off_minutes = 0;}

  var off_total_seconds = (60*60*off_hours)+(60*off_minutes)+off_seconds;

  //The following few lines of code to convert from int to byte array are from: https://stackoverflow.com/questions/15761790/convert-a-32bit-integer-into-4-bytes-of-data-in-javascript
  //except we used Uint32Array in stead
  var theByteArrayToSend = new Uint8Array([
     (off_total_seconds & 0xff000000) >> 24,
     (off_total_seconds & 0x00ff0000) >> 16,
     (off_total_seconds & 0x0000ff00) >> 8,
     (offMinutes_total_seconds & 0x000000ff)
  ]);
  //console.log("theByteArrayToSend: ");
  //console.log(theByteArrayToSend);

  ble.write(connectingDevice.id, lampService, offInCharacteristic, theByteArrayToSend.buffer);
}


    function generateArduinoTimestamp(in_hour, in_min, in_sec, in_day, in_month, in_year){
      var theDate = new Date();
      theDate.setHours(in_hour);
      theDate.setMinutes(in_min);
      theDate.setSeconds(in_sec);
      theDate.setDate(in_day);
      theDate.setMonth(in_month); //Starting with January = 0
      theDate.setFullYear(in_year);
      var UTCinSeconds = theDate.UTC()/1000;
      return UTCinSeconds;
    }

    function generateArduinoTimestamp_Now() {
      console.log("in the timestamp function")
      var theDate = new Date();
      var UTCinSeconds = Math.floor(Date.UTC(theDate.getFullYear(), theDate.getMonth(), theDate.getDate(), theDate.getHours(), theDate.getMinutes(), theDate.getSeconds())/1000);
      console.log(UTCinSeconds);
      return UTCinSeconds;
    }

  function setOnAt(){
      console.log("clicked setOnAt");
      var on_hours = document.getElementById("onAtHours").value;
      var on_minutes = document.getElementById("onAtMinutes").value;
      var on_seconds = document.getElementById("onAtSeconds").value;

      var theByteArrayToSend = Uint8Array(3);
      theByteArrayToSend[0] = on_hours;
      theByteArrayToSend[1] = on_minutes;
      theByteArrayToSend[2] = on_seconds;
      ble.write(connectingDevice.id, lampService, onAtCharacteristic, theByteArrayToSend.buffer);

    }
    function setOffAt(){
      console.log("clicked setOffAt");
      var off_hours = document.getElementById("offAtHours").value;
      var off_minutes = document.getElementById("offAtMinutes").value;
      var off_seconds = document.getElementById("offAtSeconds").value;

      var theByteArrayToSend = Uint8Array(3);
      theByteArrayToSend[0] = off_hours;
      theByteArrayToSend[1] = off_minutes;
      theByteArrayToSend[2] = off_seconds;
      ble.write(connectingDevice.id, lampService, offAtCharacteristic, theByteArrayToSend.buffer);
    }
    function setTime(){
      console.log("clicked setTime");
      var setTime_arduinoTimestamp = parseInt(generateArduinoTimestamp_Now());

      //The following few lines of code to convert from int to byte array are from: https://stackoverflow.com/questions/15761790/convert-a-32bit-integer-into-4-bytes-of-data-in-javascript
      //Except we are using Uint32Array instead
      var theByteArrayToSend = new Uint8Array([
         (setTime_arduinoTimestamp & 0xff000000) >> 24,
         (setTime_arduinoTimestamp & 0x00ff0000) >> 16,
         (setTime_arduinoTimestamp & 0x0000ff00) >> 8,
         (setTime_arduinoTimestamp & 0x000000ff)
      ]);
      console.log("theByteArrayToSend: ");
      console.log(theByteArrayToSend);

      ble.write(connectingDevice.id, lampService, setTimeCharacteristic, theByteArrayToSend.buffer);
    }













 // ********   Functions for device connection related events

 function deviceConnectionSuccess(device) {
     clearTimeout(connectionTimeout);
     connectingModal.hide();
     connectingDevice = device;

     // Studio 11:  Now that the device is connected, request any data that's needed
 //    readButton();
     // Set up a timer to repeatedly "poll" for data.
     //connectingDevice.pollingTimer = setInterval(readButton, 1000);
     console.log("starting notifications")
     ble.startNotification(connectingDevice.id, lampService, onCharacteristic, onData);
     ble.startNotification(connectingDevice.id, lampService, rgbCharacteristic, rgbData);
     ble.startNotification(connectingDevice.id, lampService, defaultCharacteristic, defaultData);
     ble.startNotification(connectingDevice.id, lampService, offInCharacteristic, timeLeftOff_afterFx);
     ble.startNotification(connectingDevice.id, lampService, onInCharacteristic, timeLeftOn_afterFx);
     ble.startNotification(connectingDevice.id, lampService, onNowCharacteristic, onData);
     ble.startNotification(connectingDevice.id, lampService, offAtCharacteristic, timeReadOffTimer_afterFx);
     ble.startNotification(connectingDevice.id, lampService, onAtCharacteristic, timeReadOnTimer_afterFx);
     ble.startNotification(connectingDevice.id, lampService, setTimeCharacteristic, timeReadNow_afterFx);
     console.log("ending notifications");

 }

 function deviceConnectionFailure(device) {
     console.log("Device Disconnected");
     pageNavigator.popPage();
     refreshDevicesModal.hide();
     connectingDevice = null;
 }

 function deviceConnectionTimeout() {
     // Device connection failure
     connectingModal.hide();
     pageNavigator.popPage();
     refreshDevicesModal.hide();
     if(connectingDevice != null) {
         clearInterval(connectingDevice.pollingTimer);
         ble.disconnect(connectingDevice.id);
     }
 }

 function disconnectDevice() {
     console.log("Disconnecting");
     if(connectingDevice !== null) {
         clearInterval(connectingDevice.pollingTimer);
         ble.disconnect(connectingDevice.id);
     }
 }


 // ***** Function for user-interface selection of a device
 function deviceSelected(evt) {
     var device = evt.currentTarget.device;
     // Initiate a connection and switch screens; Pass in the "device" object
     pageNavigator.pushPage('deviceDetails.html', {data: {device: evt.currentTarget.device}});
     connectingDevice = device;
     ble.connect(device.id, deviceConnectionSuccess, deviceConnectionFailure);

     connectionTimeout = setTimeout(deviceConnectionTimeout, CONNECTION_TIMEOUT);
 }

 // *****  Function for initial startup
 ons.ready(function() {
     console.log("Ready");

     // Initialize global variables
     refreshDevicesModal = document.getElementById('refreshDevicesModal');
     pageNavigator = document.querySelector('#pageNavigator');
     pageNavigator.addEventListener('postpop', disconnectDevice);

     var refreshButton = document.getElementById('refreshButton');
     refreshButton.addEventListener('click',  function() {
             console.log("Refresh; Showing modal");
             startScan();
     } );

     deviceList = document.getElementById('deviceList');

     // Add a "disconnect" when app auto-updates
     if(typeof window.phonegap !== 'undefined') {
         // Works for iOS (not Android)
         var tmp = window.phonegap.app.downloadZip;
         window.phonegap.app.downloadZip = function (options) {
             disconnectDevice();
             tmp(options);
         }
     }

     var pullHook = document.getElementById('pull-hook');
     pullHook.onAction = function(done) {
         startScan();
         // Call the "done" function in to hide the "Pull to Refresh" message (but delay just a little)
         setTimeout(done, 500);
     };
 });


 // *** Functions for page navigation (page change) events
 document.addEventListener('init', function(event) {
     var page = event.target;

     if (page.id === 'deviceDetails') {
         // Enable the modal window
         connectingModal = document.getElementById('connectingModal');
         connectingModal.show();

         // Update the page's title bar
         page.querySelector('ons-toolbar .center').innerHTML = "Device Details";
         document.getElementById("buttonValue").addEventListener("change", function(event) {
                 alert("Don't change the switch!")
                 event.switch.checked = !event.switch.checked;
             });
     }
 });



var app = {
    // Application Constructor
    initialize: function() {
        this.bindEvents();
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicitly call 'app.receivedEvent(...);'
    onDeviceReady: function() {
        app.receivedEvent('deviceready');
    },
    // Update DOM on a Received Event
    receivedEvent: function(id) {
        var parentElement = document.getElementById(id);
        var listeningElement = parentElement.querySelector('.listening');
        var receivedElement = parentElement.querySelector('.received');

        listeningElement.setAttribute('style', 'display:none;');
        receivedElement.setAttribute('style', 'display:block;');

        console.log('Received Event: ' + id);
    }

  };

console.log("loaded index.js");
