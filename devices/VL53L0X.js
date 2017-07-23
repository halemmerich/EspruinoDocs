/* Copyright (c) 2017 Gordon Williams, Pur3 Ltd. See the file LICENSE for copying permission. */
var C = {
  REG_SYSRANGE_START : 0,
  REG_RESULT_RANGE_STATUS : 0x0014
};

/** 
Init VL53 Sensor with default address.
Store Address in a variable, this allows to change the address later.
*/
function VL53L0X(i2c, options) {
  this.options = options||{};
  this.i2c = i2c;
  this.ad = 0x52>>1;
  this.init();
}

/** initialise VL53L0X */
VL53L0X.prototype.init = function() {
  this.w(0x80, 0x01);
  this.w(0xFF, 0x01);
  this.w(0x00, 0x00);
  this.StopVariable = this.r(0x91,1)[0];
  this.w(0x00, 0x01);
  this.w(0xFF, 0x00);
  this.w(0x80, 0x00);
};

/** this function set a new device address.
Call this function before you initialise the VL53! */
VL53L0X.prototype.a = function(addr) {
  this.i2c.writeTo(0x52>>1, 0x8a, addr);
};

VL53L0X.prototype.r = function(addr,n) {
  this.i2c.writeTo(this.ad, addr);
  return this.i2c.readFrom(this.ad, n);
};
VL53L0X.prototype.w = function(addr,d) {
  this.i2c.writeTo(this.ad, addr, d);
};

/** Perform one measurement and return the result.

Returns an object of the form:

{
   distance , // distance in mm
   signalRate, // target reflectance
   ambientRate, // ambient light.
   effectiveSpadRtnCount //  effective SPAD count for the return signal
}
 */
VL53L0X.prototype.performSingleMeasurement = function() {
  // start measurement
  this.w(0x80, 0x01);
  this.w(0xFF, 0x01);
  this.w(0x00, 0x00);
  this.w(0x91, this.StopVariable);
  this.w(0x00, 0x01);
  this.w(0xFF, 0x00);
  this.w(0x80, 0x00);
  // VL53L0X_DEVICEMODE_SINGLE_RANGING:
  this.w(C.REG_SYSRANGE_START, 0x01);
  // wait for it to finish
  while (!this.r(C.REG_RESULT_RANGE_STATUS,1)[0]&1);
  // read and format data
  var d = new DataView(this.r(0x14, 12).buffer);
  var res = {
    distance : d.getUint16(10),
    signalRate : d.getUint16(6) / 128,
    ambientRate : d.getUint16(8) / 128,
    effectiveSpadRtnCount : d.getUint16(2) / 256
  };
  // TODO: use LinearityCorrectiveGain/etc
  return res;
};

/** Parameters
   newAddress -> new I2C Address which should be used for this device
				 The Address should be a multiple of 2! Please consider
				 other devices on the bus!
 */
VL53L0X.prototype.changeAddress = function( newAddress ) {
	this.a( newAddress>>1 );
	this.ad = newAddress>>1;
}

exports.connect = function(i2c, options) {
  return new VL53L0X(i2c, options);
}
