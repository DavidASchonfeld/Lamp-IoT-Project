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

var buttonService        = "5e6c559f-8763-4d40-bb71-5464460f6082";
var buttonCharacteristic = "31fc6caf-d02f-475c-bedf-603c933c4e1b";

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


var messageCounter = 0;

// ***** Button Related Functions ********
function buttonData(buffer) {
    var array = new Uint8Array(buffer)
    var buttonValue = document.getElementById("buttonValue");
    buttonValue.checked =  (array[0] != 0);
    messageCounter++;

    console.log("Total Messages: " + messageCounter);
}

function buttonDataFailed() {
    console.log("Button Read Failed");
}

function readButton() {
    ble.read(connectingDevice.id, buttonService, buttonCharacteristic, buttonData, buttonDataFailed);
}


// ********   Functions for device connection related events

function deviceConnectionSuccess(device) {
    clearTimeout(connectionTimeout);
    connectingModal.hide();
    connectingDevice = device;

    // Studio 11:  Now that the device is connected, request any data that's needed
//    readButton();
    // Set up a timer to repeatedly "poll" for data.
    connectingDevice.pollingTimer = setInterval(readButton, 1000);
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
console.log("loaded index.js");
