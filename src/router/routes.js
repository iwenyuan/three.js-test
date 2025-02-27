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
  }
]

export default routes
