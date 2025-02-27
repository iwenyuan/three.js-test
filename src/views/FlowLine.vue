<script setup>
import ThreeAMapBase from './js/ThreeAMapBase.js'
import { useMapStore } from '@/stores/map'
import * as THREE from 'three'
import TC_BORDER from '/public/data/TC_BORDER.json'

const mapStore = useMapStore()
let data = null

class FlowLineLayer extends ThreeAMapBase {
  constructor() {
    super()

    this.isStats = true
  }

  async createChart() {
    this.texture = this.loadTexture('/public/texture/spriteLine.png')

    const path = data.map(([x, y]) => {
      return new THREE.Vector3(x, y, 0)
    })

    // Catmull-Rom三维样条曲线
    const curve = new THREE.CatmullRomCurve3(path)

    // (管道段数,半径,管道横截面的分段数,管道是否闭合)
    const geometry = new THREE.TubeGeometry(curve, path.length - 1, 256, 8, true)

    // 着色器材质
    const material = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      map: this.texture,
      transparent: true,
      side: THREE.DoubleSide, // 双面渲染
      alphaMap: this.texture
    })

    const mesh = new THREE.Mesh(geometry, material)

    this.scene.add(mesh)
  }

  animateAction() {
    if (this.texture) {
      this.texture.offset.x += 0.01
    }
  }

  loadTexture(url) {
    const texture = new THREE.TextureLoader().load(url)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(1, 1)
    return texture
  }
}
const initLayer = () => {
  const customCoords = mapStore.getMap().customCoords
  data = customCoords.lngLatsToCoords(TC_BORDER.features[0].geometry.coordinates[0][0])
  const layer = new FlowLineLayer()
  layer.init(mapStore.getMap(), mapStore.getContainer())
}
</script>

<template>
  <operate-box>
    <a-button type="primary" @click="initLayer">流动线</a-button>
  </operate-box>
</template>

<style scoped></style>
