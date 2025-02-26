<script setup>
import routers from '@/router/routes'
import AMapLoader from '@amap/amap-jsapi-loader'
import { useMapStore } from '@/stores/map'
import { useRouter } from 'vue-router'
const router = useRouter()
const mapStore = useMapStore()
const conRef = ref(null)

const handleClick = (item) => {
  router.push(item.path)
}

onMounted(() => {
  window._AMapSecurityConfig = {
    securityJsCode: '92affaf9c87798af7afea4956ea5d13a'
  }
  AMapLoader.load({
    key: '7f036bc82b40201f8c153c2d2bc1c7eb',
    version: '2.0',
    plugins: []
  })
    .then((AMap) => {
      const map = new AMap.Map('map', {
        viewMode: '3D',
        zoom: 11,
        center: [121.130855, 31.457456]
      })
      map.on('click', (e) => {
        console.log([e.lnglat.getLng(), e.lnglat.getLat()])
      })
      map.on('complete', () => {})
      mapStore.updateMap(map)
      mapStore.updateContainer(conRef.value)
    })
    .catch((e) => {
      console.log(e)
    })
})
</script>

<template>
  <a-layout class="home-view">
    <a-layout-sider theme="dark">
      <a-menu theme="dark">
        <a-menu-item v-for="item in routers" :key="item.path" @click="handleClick(item)">
          {{ item.meta.title }}
        </a-menu-item>
      </a-menu>
    </a-layout-sider>
    <a-layout>
      <a-layout-content class="main">
        <div id="map" ref="conRef"></div>
        <router-view></router-view>
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<style lang="less" scoped>
.home-view {
  height: 100vh;
  .main {
    position: relative;
    padding: 0;
  }
  #map {
    width: 100%;
    height: 100%;
  }
}
</style>
