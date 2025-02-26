<script setup>
import { useMapStore } from '@/stores/map'
import * as THREE from 'three'
import TC_BORDER from '/public/data/TC_BORDER.json'

const mapStore = useMapStore()
const data = TC_BORDER.features[0].geometry.coordinates[0][0]

let scene, camera, renderer
let map, container, customCoords
let texture, shaderMaterial
const height = 1000

const initLayer = () => {
  map = mapStore.getMap()
  container = mapStore.getContainer()
  customCoords = map.customCoords

  const layer = new AMap.GLCustomLayer({
    zIndex: 9999,
    visible: true,
    init: (gl) => {
      initThree(gl)
      drawOneSide()
      animate()
    },
    render: () => {
      const { fov, aspect, near, far, position, up, lookAt } = customCoords.getCameraParams()
      camera.near = near
      camera.far = far
      camera.fov = fov
      camera.position.set(...position)
      camera.up.set(...up)
      camera.lookAt(...lookAt)
      camera.updateProjectionMatrix()
      renderer.render(scene, camera)
      // 这里必须执行！！重新设置 three 的 gl 上下文状态。
      renderer.resetState()
    }
  })

  map.add(layer)
}

/**
 * 使用着色器材质绘制围栏
 * 着色器材质，顶点颜色，多材质，环境贴图，渐变纹理
 * 性能优先：着色器材质，顶点颜色（只能绘制渐变）
 * 渐变纹理：动态改变颜色
 * 多材质：精确控制不同部分材质
 * 复杂效果：环境贴图
 *
 * 1.坐标转换
 * 2.确保线路闭合
 * 3.计算顶点坐标，三角面坐标和UV坐标
 * 4.创建着色器材质
 */
const drawOneSide = () => {
  // 经纬度坐标转换为空间坐标
  const path = customCoords.lngLatsToCoords(data)
  if (path[0].toString() !== path[path.length - 1].toString()) {
    path.push(path[0])
  }

  // 贴图纹理
  const vec3List = []
  let faceList = []
  let uvList = []
  const t0 = [0, 0]
  const t1 = [1, 0]
  const t2 = [1, 1]
  const t3 = [0, 1]

  //
  for (let i = 0; i < path.length; i++) {
    const [x, y] = path[i]
    vec3List.push([x, y, 0])
    vec3List.push([x, y, height])
  }

  for (let i = 0; i < vec3List.length - 2; i++) {
    const a = vec3List[i]
    const b = vec3List[i + 1]
    const c = vec3List[i + 2]

    if (i % 2 === 0) {
      // 下三角
      faceList = [...faceList, ...a, ...c, ...b]
      // UV
      uvList = [...uvList, ...t0, ...t1, ...t3]
    } else {
      // 上三角
      faceList = [...faceList, ...a, ...b, ...c]
      // UV
      uvList = [...uvList, ...t3, ...t1, ...t2]
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(faceList), 3))
  geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvList), 2))

  texture = new THREE.TextureLoader().load('/public/texture/texture_256.png')
  texture.wrapS = THREE.RepeatWrapping // 水平重复平铺
  texture.wrapT = THREE.RepeatWrapping // 垂直重复平铺

  const material1 = new THREE.MeshBasicMaterial({
    color: new THREE.Color('rgb(0,133,254)'),
    transparent: true,
    depthWrite: false, // 是否写入深度缓冲器
    side: THREE.DoubleSide, // 双面渲染
    alphaMap: texture
  })
  const mesh1 = new THREE.Mesh(geometry, material1)
  scene.add(mesh1)

  // 着色器材质
  shaderMaterial = new THREE.ShaderMaterial({
    uniforms: {
      colorTop: { value: new THREE.Color(0x3366ff) },
      colorBottom: { value: new THREE.Color(0x00ccff) },
      time: { value: 0 }
    },
    vertexShader: `
      varying vec2 vUv;

      void main(){
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 colorTop;
      uniform vec3 colorBottom;
      uniform float time;
      varying vec2 vUv;

      void main(){
        float y = mod(vUv.y - time, 1.0); // 使用mod函数使渐变循环
        gl_FragColor = vec4(mix(colorTop, colorBottom, y), 0.5);
      }`,
    wireframe: false, // 是否显示线框
    transparent: true, // 是否透明
    side: THREE.DoubleSide // 双面渲染
  })
  const mesh2 = new THREE.Mesh(geometry, shaderMaterial)
  //   scene.add(mesh2)
}

const initThree = (gl) => {
  camera = new THREE.PerspectiveCamera(
    60,
    container.clientWidth / container.clientHeight,
    100,
    1 << 30
  )
  scene = new THREE.Scene()

  renderer = new THREE.WebGLRenderer({
    context: gl,
    antialias: true // 抗锯齿
  })
  renderer.autoClear = false // 禁止自动清空画布
  renderer.outputEncoding = THREE.sRGBEncoding

  // 环境光
  const light = new THREE.AmbientLight(0xffffff, 0.1)
  scene.add(light)

  window.addEventListener('resize', onWindowResize)
}

const onWindowResize = () => {
  camera.aspect = container.clientWidth / container.clientWidth
  camera.updateProjectionMatrix()
  renderer.setSize(container.clientWidth, container.clientWidth)
}

let animationFrameId = null
let texture_offset = 0
const animate = () => {
  // 纹理滚动
  texture_offset -= 0.005 // 向上移动
  texture.offset.set(0, texture_offset)

  // 着色器材质动画
  //   shaderMaterial.uniforms.time.value += 0.01

  map && map.render()
  animationFrameId = requestAnimationFrame(() => {
    animate()
  })
}

onUnmounted(() => {
  cancelAnimationFrame(animationFrameId)
  animationFrameId = null
  map.remove(glCustumerLayer)
})
</script>

<template>
  <operate-box>
    <a-button type="primary" @click="initLayer">电子围栏</a-button>
  </operate-box>
</template>

<style lang="less" scoped></style>
