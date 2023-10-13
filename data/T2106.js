const fz = require('zigbee-herdsman-converters/converters/fromZigbee');
const tz = require('zigbee-herdsman-converters/converters/toZigbee');
const exposes = require('zigbee-herdsman-converters/lib/exposes');
const reporting = require('zigbee-herdsman-converters/lib/reporting');
const extend = require('zigbee-herdsman-converters/lib/extend');
const ota = require('zigbee-herdsman-converters/lib/ota');
const e = exposes.presets;
const ea = exposes.access;

const bulbOnEvent = async (type, data, device, options, state) => {
    /**
     * IKEA bulbs lose their configured reportings when losing power.
     * A deviceAnnounce indicates they are powered on again.
     * Reconfigure the configured reoprting here.
     *
     * Additionally some other information is lost like
     *   color_options.execute_if_off. We also restore these.
     *
     * NOTE: binds are not lost so rebinding is not needed!
     */
    if (type === 'deviceAnnounce') {
        for (const endpoint of device.endpoints) {
            for (const c of endpoint.configuredReportings) {
                await endpoint.configureReporting(c.cluster.name, [{
                    attribute: c.attribute.name, minimumReportInterval: c.minimumReportInterval,
                    maximumReportInterval: c.maximumReportInterval, reportableChange: c.reportableChange,
                }]);
            }
        }

        // NOTE: execute_if_off default is false
        //       we only restore if true, to save unneeded network writes
        if (state !== undefined && state.color_options !== undefined && state.color_options.execute_if_off === true) {
            device.endpoints[0].write('lightingColorCtrl', {'options': 1});
        }
        if (state !== undefined && state.level_config !== undefined && state.level_config.execute_if_off === true) {
            device.endpoints[0].write('genLevelCtrl', {'options': 1});
        }
        if (state !== undefined && state.level_config !== undefined && state.level_config.on_level !== undefined) {
            let onLevel = state.level_config.on_level;
            if (typeof onLevel === 'string' && onLevel.toLowerCase() == 'previous') {
                onLevel = 255;
            } else {
                onLevel = Number(onLevel);
            }
            if (onLevel > 255) onLevel = 254;
            if (onLevel < 1) onLevel = 1;

            device.endpoints[0].write('genLevelCtrl', {onLevel});
        }
    }
};

const definition = {
    zigbeeModel: ['STOFTMOLN ceiling/wall lamp WW15'],
    model: 'T2106',
    vendor: 'IKEA',
    description: 'STOFTMOLN ceiling/wall lamp 15 warm light dimmable',
    extend: {
        ...extend.light_onoff_brightness(),
        ota: ota.tradfri,
        onEvent: bulbOnEvent,
    },
};

module.exports = definition;
