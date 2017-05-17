//Adam Epstein and David Schonfeld

//Documentation:
//
//FF00 Fade On/Off
//  Write: If input == 0
//    Fade off the light
//  else
//    Fade the color to default color (and turn it on if it was off)
//  Read: If 0, the light is off. Else, the light is on.
//FF01 Crossfade to Certain Color
//  Write: Crossfade the color to the 3-hex-value color inputted
//  Read: The current color of the light
//FF02 Set Default Color
//  Write: Set default color in 3-hex-value
//  Read: The default color
//FF03 Off in X seconds
//  Write: Off in T (in 7 bytes. To turn it off in 3 seconds, type 0000003 as the input)
//  Read: How much time is left before the light turns off
//FF04: On in X seconds
//  Write: On in T (in 7 bytes. To turn it on in 3 seconds, type 0000003 as the input)
//  Read: How much time is left before the light turns on
//FF05: On/Off Now
//  Write:  If input == 0
//    Immediately off the light
//  else
//    Immediately change the color to default color (and turn it on if it was off)
//  Read: If 0, the light is off. Else, the light is on.
//FF06: On at [Certain Time] daily
//  Write: Fade on the light, every day, at a certain time. (Written in HH:MM:SS, with each value in hex)
//  Read: WORK ON THIS: SHOULD BE READ BY APP
//FF07: Off at [Certain Time] daily
//  Write: Fade off the light, every day, at a certain time. (Written in HH:MM:SS, with each value in hex)
//  Read: WORK ON THIS: SHOULD BE READ BY APP
//FF08: Current Time
//  Write: Set time by sending a UNIX timestamp (4 bytes long)
//  Read: The current time as a UNIX timestamp (4 bytes long)

#include <DuoBLE.h>

SYSTEM_MODE(MANUAL);

const char * const deviceName = "AdamLight";

// Define a service and its data: The "numbers" are randomly generated from https://www.uuidgenerator.net/
BLEService simpleCustomService("52162a8a-a80e-4901-855c-cb354f79ee14");
BLECharacteristic onCharacteristic("FF00", ATT_PROPERTY_READ | ATT_PROPERTY_WRITE | ATT_PROPERTY_NOTIFY, 1, 1);
BLECharacteristic rgbCharacteristic("FF01", ATT_PROPERTY_READ | ATT_PROPERTY_WRITE | ATT_PROPERTY_NOTIFY, 3, 3);
BLECharacteristic greenCharacteristic("FF02", ATT_PROPERTY_READ | ATT_PROPERTY_WRITE | ATT_PROPERTY_NOTIFY);
BLECharacteristic blueCharacteristic("FF03", ATT_PROPERTY_READ | ATT_PROPERTY_WRITE | ATT_PROPERTY_NOTIFY);
BLECharacteristic fadeOnInCharacteristic("FF04", ATT_PROPERTY_READ | ATT_PROPERTY_WRITE | ATT_PROPERTY_NOTIFY);
BLECharacteristic onNowCharacteristic("FF05", ATT_PROPERTY_READ | ATT_PROPERTY_WRITE | ATT_PROPERTY_NOTIFY, 1, 1);
BLECharacteristic onAtCharacteristic("FF06", ATT_PROPERTY_READ | ATT_PROPERTY_WRITE | ATT_PROPERTY_NOTIFY);
BLECharacteristic offAtCharacteristic("FF07", ATT_PROPERTY_READ | ATT_PROPERTY_WRITE | ATT_PROPERTY_NOTIFY);
BLECharacteristic setTimeCharacteristic("FF08", ATT_PROPERTY_READ | ATT_PROPERTY_WRITE | ATT_PROPERTY_NOTIFY);



// The following two functions are optional: They identify when a device connects/disconnects
void BLE_connected() {
  Serial.println("Central Connected");
}
void BLE_disconnected() {
  Serial.println("Central Disconnected");
}

boolean on = false;

double rNow = 0;
double gNow = 0;
double bNow = 0;
int rFrom = 0;
int gFrom = 0;
int bFrom = 0;
int rTo = 0;
int gTo = 0;
int bTo = 0;

int rDefault = 255;
int gDefault = 255;
int bDefault = 255;

double fadeDuration = 5000;
double fadeInterval = 500;

int updateFadeOff_secondsLeft = 1;
int updateFadeOn_secondsLeft = 1;

//I chose the following default values because they are positive and don't exist in our Time system
long int alarm_on_hour = 25;
long int alarm_on_min = 61;
long int alarm_on_sec = 61;

long int alarm_off_hour = 25;
long int alarm_off_min = 61;
long int alarm_off_sec = 61;


void setAlarm_On(int in_hour, int in_min, int in_sec){
  alarm_on_hour = in_hour;
  alarm_on_min = in_min;
  alarm_on_sec = in_sec;

  Serial.print("\"On Alarm\" now set at: ");
  Serial.print(alarm_on_hour);
  Serial.print(":");
  Serial.print(alarm_on_min);
  Serial.print(":");
  Serial.println(alarm_on_sec);
}
void setAlarm_Off(int in_hour, int in_min, int in_sec){
  alarm_off_hour = in_hour;
  alarm_off_min = in_min;
  alarm_off_sec = in_sec;

  Serial.print("\"Off Alarm\" now set at: ");
  Serial.print(alarm_off_hour);
  Serial.print(":");
  Serial.print(alarm_off_min);
  Serial.print(":");
  Serial.println(alarm_off_sec);
}

void fadeTo() {
  
  double rDifference = rTo - rFrom;
  double gDifference = gTo - gFrom;
  double bDifference = bTo - bFrom;

  rNow += rDifference / (fadeDuration / fadeInterval);
  gNow += gDifference / (fadeDuration / fadeInterval);
  bNow += bDifference / (fadeDuration / fadeInterval);

  Serial.println("Changing Color");
  RGB.color(rNow, gNow, bNow);

  Serial.print("rgb: ");
  Serial.print(rNow);
  Serial.print(",");
  Serial.print(gNow);
  Serial.print(",");
  Serial.println(bNow);

  byte value[3];
  value[0] = (byte) rNow;
  value[1] = (byte) gNow;
  value[2] = (byte) bNow;
  rgbCharacteristic.setValue(value, 3);
  rgbCharacteristic.sendNotify();
}


Timer fadeTimer = Timer(fadeInterval, fadeTo);
boolean isr = false;

void stopTimer() {
  if (!isr) {
    fadeTimer.stop();   
  } else {    
    fadeTimer.stopFromISR();    
  }
  rNow = rTo;
  gNow = gTo;
  bNow = bTo;

  RGB.color(rNow, gNow, bNow);

  Serial.println("Stopping");
  byte value[3];
  value[0] = (byte) rNow;
  value[1] = (byte) gNow;
  value[2] = (byte) bNow;
  rgbCharacteristic.setValue(value, 3);
  rgbCharacteristic.sendNotify();
}

Timer fadeStopper = Timer(fadeDuration, stopTimer, true);

void crossFade(int r, int g, int b) {
  rTo = r;
  gTo = g;
  bTo = b;
  rFrom = rNow;
  gFrom = gNow;
  bFrom = bNow;
  isr = false;

  fadeTimer.start();
  fadeStopper.start();

}

void crossFadefromISR(int r, int g, int b) {    
  Serial.println("cross fading");   
  rTo = r;    
  gTo = g;    
  bTo = b;    
  rFrom = rNow;   
  gFrom = gNow;   
  bFrom = bNow;   
  isr = true;   
  Serial.println("starting timers");    
  fadeTimer.startFromISR();   
  fadeStopper.startFromISR();   
  Serial.println("timers are started");   
}



void crossFade_Off() {
  crossFade(0, 0, 0);
  on = false;    
  byte value[1] = {0};    
  onCharacteristic.setValue(value, 1);    
  onNowCharacteristic.setValue(value, 1);   
  onCharacteristic.sendNotify();    
  onNowCharacteristic.sendNotify();
}
void crossFade_On() {
  crossFade(rDefault, gDefault, bDefault);
  on = true;    
  byte value[1] = {1};    
  onCharacteristic.setValue(value, 1);    
  onNowCharacteristic.setValue(value, 1);   
  onCharacteristic.sendNotify();    
  onNowCharacteristic.sendNotify();
}

void updateFade_Off() {
  byte value[4];
  blueCharacteristic.getValue(value, 4);
  updateFadeOff_secondsLeft = value[0] << 24 | value[1] << 16 | value[2] << 8 | value[3];

  updateFadeOff_secondsLeft--;

  if (updateFadeOff_secondsLeft >= 0) {
    value[0] = updateFadeOff_secondsLeft >> 24;
    value[1] = updateFadeOff_secondsLeft >> 16;
    value[2] = updateFadeOff_secondsLeft >> 8;
    value[3] = updateFadeOff_secondsLeft;
    blueCharacteristic.setValue(value, 4);
    blueCharacteristic.sendNotify();
  }
  //The code checking for when
  // updateFadeOff_secondsLeft == 0
  // and acting accordingly is in the loop()
}
void updateFade_On() {
  byte value[4];
  fadeOnInCharacteristic.getValue(value, 4);
  updateFadeOn_secondsLeft = value[0] << 24 | value[1] << 16 | value[2] << 8 | value[3];

  updateFadeOn_secondsLeft--;

  if (updateFadeOn_secondsLeft >= 0) {
    value[0] = updateFadeOn_secondsLeft >> 24;
    value[1] = updateFadeOn_secondsLeft >> 16;
    value[2] = updateFadeOn_secondsLeft >> 8;
    value[3] = updateFadeOn_secondsLeft;
    fadeOnInCharacteristic.setValue(value, 4);
    fadeOnInCharacteristic.sendNotify();
  }
  //The code checking for when
  // updateFadeOn_secondsLeft == 0
  // and acting accordingly is in the loop()
}

Timer fadeOffTimer = Timer(1000, updateFade_Off);
Timer fadeOnTimer = Timer(1000, updateFade_On);

boolean pressChecker = false;

Timer buttonPressedTimer(50, checkPressed, true);   
int buttonPress = 0;

void checkPressed() {
  if (digitalRead(D1) == 0) {
    buttonPress++;    
    Serial.println(buttonPress);    
    byte value[1];    
    if (on) {
      value[0] = 0;
      on = false;
      crossFadefromISR(0, 0, 0);
    } else {
      value[0] = 1;
      on = true;
      crossFadefromISR(rDefault, gDefault, bDefault);
    }
    onCharacteristic.setValue(value, 1);
    onNowCharacteristic.setValue(value, 1);
    onCharacteristic.sendNotify();
    onNowCharacteristic.sendNotify();
  }
}

void buttonPressed() {
  //Serial.println("buttonpressed running");

  if (digitalRead(D1) == 0)  {
    //Serial.println("zero");

    buttonPressedTimer.startFromISR();

    Serial.println("button pressed timer started");
  }

}

void onoffCallback(BLERecipient recipient, BLECharacteristicCallbackReason reason) {
  const char *reasons[] = {"PREREAD",  "POSTREAD", "POSTWRITE", "NOTIFICATIONS_ENABLED", "NOTIFICATIONS_DISABLED",  "INDICATIONS_ENABLED", "INDICATIONS_DISABLED"};
  Serial.print("Read/Write Characteristic; Reason: ");
  Serial.println(reasons[reason]);

  if (reason == POSTWRITE) {
    // Update the data before it's read
    byte value[1];
    onCharacteristic.getValue(value, 1);
    if (value[0] == 0) {
      on = false;
      crossFade(0, 0, 0);
       onNowCharacteristic.setValue(value, 1);
    } else {
      on = true;
      crossFade(rDefault, gDefault, bDefault);
      onNowCharacteristic.setValue(value, 1);
    }
    onNowCharacteristic.sendNotify();
  }
}


void rgbCallback(BLERecipient recipient, BLECharacteristicCallbackReason reason) {

  if (reason == POSTWRITE) {
    byte value[6];
    rgbCharacteristic.getValue(value, 3);
    int r = value[0];
    int g = value[1];
    int b = value[2];
    Serial.print("New rgb: ");
    Serial.print(r);
    Serial.print(",");
    Serial.print(g);
    Serial.print(",");
    Serial.println(b);
    crossFade(r, g, b);
  } else if (reason == PREREAD){
    byte value[3];
    value[0] = (byte) rNow;
    value[1] = (byte) gNow;
    value[2] = (byte) bNow;
    rgbCharacteristic.setValue(value, 3);
  }
}

//Set default color
void greenCallback(BLERecipient recipient, BLECharacteristicCallbackReason reason) {

  if (reason == POSTWRITE) {
    byte value[6];
    greenCharacteristic.getValue(value, 3);
    rDefault = value[0];
    gDefault = value[1];
    bDefault = value[2];
    Serial.print("New default rgb: ");
    Serial.print(rDefault);
    Serial.print(",");
    Serial.print(gDefault);
    Serial.print(",");
    Serial.println(bDefault);
  } else if (reason == PREREAD){
    byte value[3];
    value[0] = (byte) rDefault;
    value[1] = (byte) gDefault;
    value[2] = (byte) bDefault;
    rgbCharacteristic.setValue(value, 3);
  }
}

//Delay to turn off
void blueCallback(BLERecipient recipient, BLECharacteristicCallbackReason reason) {


  if (reason == POSTWRITE) {
    byte value[4];
    blueCharacteristic.getValue(value, 4);
    int i = value[0] << 24 | value[1] << 16 | value[2] << 8 | value[3];

    Serial.print("Turning off in ");
    Serial.print(i);
    Serial.println("seconds");
    
    fadeOffTimer.start();
  }

}

void fadeOnInCallback(BLERecipient recipient, BLECharacteristicCallbackReason reason) {


  if (reason == POSTWRITE) {
    byte value[4];
    fadeOnInCharacteristic.getValue(value, 4);
    int i = value[0] << 24 | value[1] << 16 | value[2] << 8 | value[3];
    //        int i = value[0];

    Serial.print("Turning on in ");
    Serial.print(i);
    Serial.println("seconds");

    fadeOnTimer.start();
  }

}

void onNowCallback(BLERecipient recipient, BLECharacteristicCallbackReason reason) {
  const char *reasons[] = {"PREREAD",  "POSTREAD", "POSTWRITE", "NOTIFICATIONS_ENABLED", "NOTIFICATIONS_DISABLED",  "INDICATIONS_ENABLED", "INDICATIONS_DISABLED"};
  Serial.print("Read/Write Characteristic; Reason: ");
  Serial.println(reasons[reason]);

  if (reason == POSTWRITE) {
    // Update the data before it's read
    byte value[1];
    onNowCharacteristic.getValue(value, 1);
    if (value[0] == 0) {
      on = false;
      RGB.color(0, 0, 0);
      rNow = 0;
      gNow = 0;
      bNow = 0;
      onCharacteristic.setValue(value, 1);
    } else {
      on = true;
      RGB.color(rDefault, gDefault, bDefault);
      rNow = rDefault;
      gNow = gDefault;
      bNow = bDefault;
      onCharacteristic.setValue(value, 1);
    }
    onCharacteristic.sendNotify();
  } else if (reason == PREREAD){
    byte value[1];
    if (on){
      value[0] = 1;
    } else {
      value[0] = 0;
    }
    onCharacteristic.setValue(value, 1);
  }
}


void onAtCallback(BLERecipient recipient, BLECharacteristicCallbackReason reason) {
  const char *reasons[] = {"PREREAD",  "POSTREAD", "POSTWRITE", "NOTIFICATIONS_ENABLED", "NOTIFICATIONS_DISABLED",  "INDICATIONS_ENABLED", "INDICATIONS_DISABLED"};
  Serial.print("Read/Write Characteristic; Reason: ");
  Serial.println(reasons[reason]);

  if (reason == POSTWRITE) {
    byte value[6];
    onAtCharacteristic.getValue(value, 3);
    int h = value[0];
    int m = value[1];
    int s = value[2];
    setAlarm_On(h, m, s);
  } else if (reason = PREREAD){
    byte value[6];
    value[0] = alarm_on_hour;
    value[1] = alarm_on_min;
    value[2] = alarm_on_sec;
    onAtCharacteristic.setValue(value, 3);
  }
}

void offAtCallback(BLERecipient recipient, BLECharacteristicCallbackReason reason) {
  const char *reasons[] = {"PREREAD",  "POSTREAD", "POSTWRITE", "NOTIFICATIONS_ENABLED", "NOTIFICATIONS_DISABLED",  "INDICATIONS_ENABLED", "INDICATIONS_DISABLED"};
  Serial.print("Read/Write Characteristic; Reason: ");
  Serial.println(reasons[reason]);

  if (reason == POSTWRITE) {
    byte value[6];
    offAtCharacteristic.getValue(value, 3);
    int h = value[0];
    int m = value[1];
    int s = value[2];
    setAlarm_Off(h, m, s);
  } else if (reason = PREREAD){
    byte value[6];
    value[0] = alarm_off_hour;
    value[1] = alarm_off_min;
    value[2] = alarm_off_sec;
    onAtCharacteristic.setValue(value, 3);
  }
}


void setTimeCallback(BLERecipient recipient, BLECharacteristicCallbackReason reason) {
  const char *reasons[] = {"PREREAD",  "POSTREAD", "POSTWRITE", "NOTIFICATIONS_ENABLED", "NOTIFICATIONS_DISABLED",  "INDICATIONS_ENABLED", "INDICATIONS_DISABLED"};
  Serial.print("Read/Write Characteristic; Reason: ");
  Serial.println(reasons[reason]);

  if (reason == POSTWRITE) {
    //UNIX Timestamp
    byte value[4];
    
    setTimeCharacteristic.getValue(value, 4);
    long int value_as_int = value[0] << 24 | value[1] << 16 | value[2] << 8 | value[3];
    Time.setTime(value_as_int);

    Serial.print("Day set to ");
    Serial.print(Time.month());
    Serial.print(" ");
    Serial.print(Time.day());
    Serial.print(", ");
    Serial.print(Time.year());
    
    Serial.print(" and time set to ");
    Serial.print(Time.hour());
    Serial.print(":");
    Serial.print(Time.minute());
    Serial.print(":");
    Serial.println(Time.second());

  } else if (reason == PREREAD){
    
    long int value_as_int = Time.now();
    
     //The following code to convert from a long to 4 bytes is from: http://stackoverflow.com/questions/3784263/converting-an-int-into-a-4-byte-char-array-c
    byte setTimeValue[] = {};
    setTimeValue[0] = (value_as_int >> 24) & 0xFF;
    setTimeValue[1] = (value_as_int >> 16) & 0xFF;
    setTimeValue[2] = (value_as_int >> 8) & 0xFF;
    setTimeValue[3] = value_as_int & 0xFF;

    setTimeCharacteristic.setValue(setTimeValue, 4);
  }
}


void setup() {
  // Put your setup code here, to run once:

  delay(2000);
  Serial.begin(9600);

  //Crossfade sruff
  RGB.control(true);
  rNow = 0;
  gNow = 0;
  bNow = 0;
  RGB.color(0, 0, 0);

  //Button Stuff
  pinMode(D1, INPUT_PULLUP);
  attachInterrupt(D1, buttonPressed, FALLING);

  //Time Stuff

  long initialTime = 1491440421;
  Time.setTime(initialTime); //Default start time1491440421 (ISO 8601: 2017-04-06T01:00:21Z)

  //The following code to convert from a long to 4 bytes is from: http://stackoverflow.com/questions/3784263/converting-an-int-into-a-4-byte-char-array-c
  byte setTimeValue[] = {};
  setTimeValue[0] = (initialTime >> 24) & 0xFF;
  setTimeValue[1] = (initialTime >> 16) & 0xFF;
  setTimeValue[2] = (initialTime >> 8) & 0xFF;
  setTimeValue[3] = initialTime & 0xFF;
  

  //---------------------------
  //  For reference:
  //  Time.hour();
  //  Time.isAM();
  //  Time.isPM();
  //  Time.minute();
  //  Time.second();
  //
  //  Time.weekday();
  //  Time.day();
  //  Time.month();
  //  Time.year();
  //
  //  Time.now(); //The # of seconds since Jan 1, 1970.
  //  Time.setTime(# of seconds since Jan 1, 1970)
  //  UNIX Timestamp is in seconds

  //Bluetooth Info
  //The order these are declared here determines the order they are shown in the LightBlue Explorer app that connects to this board via bluetooth

  byte onoffValue[1] = {0};  
  onCharacteristic.setValue(onoffValue, 1);    
  onCharacteristic.setCallback(onoffCallback);    
  simpleCustomService.addCharacteristic(onCharacteristic);  

  byte rgbValue[] = {0, 0, 0, 0, 0, 0};
  rgbCharacteristic.setValue(rgbValue, 6);
  rgbCharacteristic.setCallback(rgbCallback);
  simpleCustomService.addCharacteristic(rgbCharacteristic);

  byte gValue[] = {0, 0};
  greenCharacteristic.setValue(gValue, 2);
  greenCharacteristic.setCallback(greenCallback);
  simpleCustomService.addCharacteristic(greenCharacteristic);

  byte bValue[] = {0, 0};
  blueCharacteristic.setValue(bValue, 2);
  blueCharacteristic.setCallback(blueCallback);
  simpleCustomService.addCharacteristic(blueCharacteristic);

  byte fadeOnInValue[] = {0, 0};
  fadeOnInCharacteristic.setValue(fadeOnInValue, 2);
  fadeOnInCharacteristic.setCallback(fadeOnInCallback);
  simpleCustomService.addCharacteristic(fadeOnInCharacteristic);  
  
  byte onNowValue[1] = {0};   
  onNowCharacteristic.setValue(onNowValue, 1);    
  onNowCharacteristic.setCallback(onNowCallback);   
  simpleCustomService.addCharacteristic(onNowCharacteristic);

  byte onAtValue[6];
    onAtValue[0] = alarm_on_hour;
    onAtValue[1] = alarm_on_min;
    onAtValue[2] = alarm_on_sec;
  onAtCharacteristic.setValue(onAtValue, 2);
  onAtCharacteristic.setCallback(onAtCallback);
  simpleCustomService.addCharacteristic(onAtCharacteristic);

  byte offAtValue[6];
    offAtValue[0] = alarm_off_hour;
    offAtValue[1] = alarm_off_min;
    offAtValue[2] = alarm_off_sec;
  offAtCharacteristic.setValue(offAtValue, 2);
  offAtCharacteristic.setCallback(offAtCallback);
  simpleCustomService.addCharacteristic(offAtCharacteristic);

  //byte setTimeValue[] //The value of setTimeValue[] is set above, when we set the time.
  setTimeCharacteristic.setValue(setTimeValue, 2);
  setTimeCharacteristic.setCallback(setTimeCallback);
  simpleCustomService.addCharacteristic(setTimeCharacteristic);


  // Add the Service
  DuoBLE.addService(simpleCustomService);

  // Start stack
  DuoBLE.begin();

  // The Advertised name and "local" name should have some agreement
  DuoBLE.advertisingDataAddName(ADVERTISEMENT, deviceName);
  DuoBLE.setName(deviceName);

  // Start advertising.
  DuoBLE.startAdvertising();
  Serial.println("BLE start advertising.");

}

void loop() {
  // put your main code here, to run repeatedly:
  
  if (updateFadeOff_secondsLeft <= 0) {
    fadeOffTimer.stop();
    crossFade_Off();
    updateFadeOff_secondsLeft = 1; //To prevent this if statement from being run constantly
  }
  if (updateFadeOn_secondsLeft <= 0) {
    fadeOnTimer.stop();
    crossFade_On();
    updateFadeOn_secondsLeft = 1; //To prevent this if statement from being run constantly
  }

  if (Time.hour() == alarm_on_hour && Time.minute() == alarm_on_min && Time.second() == alarm_on_sec){
    Serial.println("Alarm for turning the light on has just triggered. Turning the light on now.");
    on = true;
    crossFade(rDefault, gDefault, bDefault);
  }
  
  if (Time.hour() == alarm_off_hour && Time.minute() == alarm_off_min && Time.second() == alarm_off_sec){
    Serial.println("Alarm for turning the light off has just triggered. Turning the light off now.");
    on = false;
    crossFade(0, 0, 0);
  }

  Serial.print("Time now is ");
  Serial.print(Time.hour());
  Serial.print(":");
  Serial.print(Time.minute());
  Serial.print(":");
  Serial.println(Time.second());


  //The following code to convert from a long to 4 bytes is from: http://stackoverflow.com/questions/3784263/converting-an-int-into-a-4-byte-char-array-c
  byte setTimeValue[] = {};
  setTimeValue[0] = (Time.now() >> 24) & 0xFF;
  setTimeValue[1] = (Time.now() >> 16) & 0xFF;
  setTimeValue[2] = (Time.now() >> 8) & 0xFF;
  setTimeValue[3] = Time.now() & 0xFF;
  setTimeCharacteristic.setValue(setTimeValue, 4);
  
  delay(1000);
}

