<script setup>
import ThreeAMapBase from './js/ThreeAMapBase.js'
import { useMapStore } from '@/stores/map'
import * as THREE from 'three'

const mapStore = useMapStore()

const initLayer = () => {}
</script>

<template>
  <operate-box>
    <a-button type="primary" @click="initLayer">显示 3D Tile</a-button>
    <a-button type="primary" @click="initLayer">隐藏 3D Tile</a-button>
  </operate-box>
</template>

<style lang="scss" scoped></style>
