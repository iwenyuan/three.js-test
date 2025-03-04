const routes = [
  {
    path: '/electronic/fence',
    name: 'ElectronicFence',
    component: () => import('@/views/ElectronicFence.vue'),
    meta: {
      title: '电子围栏'
    }
  },
  {
    path: '/flow/line',
    name: 'FlowLine',
    component: () => import('@/views/FlowLine.vue'),
    meta: {
      title: '流动线'
    }
  },
  {
    path: '/quarter',
    name: 'Quarter',
    component: () => import('@/views/Quarter.vue'),
    meta: {
      title: '建筑单体化'
    }
  },
  {
    path: '/terrain/polygon',
    name: 'TerrainPolygon',
    component: () => import('@/views/TerrainPolygon.vue'),
    meta: {
      title: '3D区域地块'
    }
  }
]

export default routes
