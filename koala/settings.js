var self = {
    nr_dc: 100,
    nr_nodes_x_dc: 10,
    boot_url: 'http://localhost:8007',
    syncer_url: 'http://localhost:8006',
    koala_url: 'http://localhost:8008',
    isCore: false,
    iface: "lo",
    port: 8008,

    vivaldi_dimensions:2,
    vivaldi_uncertainty_factor:0.25, 
    vivaldi_correction_factor:0.25
};

module.exports = self
