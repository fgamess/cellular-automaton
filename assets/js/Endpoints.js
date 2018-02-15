function Endpoints () {
    this.newGeneration = '/api/grid/new-generation';
    this.templates = {
        random: '/api/grid/generate&template=random',
        gosper_glider_gun: '/api/grid/generate&template=glider_gun',
        glider: '/api/grid/generate&template=glider',
        exploder: '/api/grid/generate&template=exploder',
        tumbler: '/api/grid/generate&template=tumbler',
        lightweight_spaceship : '/api/grid/generate&template=lightweight_spaceship',
    }
}