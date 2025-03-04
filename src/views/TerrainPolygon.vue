<script setup>
import * as THREE from 'three'
import { TessellateModifier } from 'three/examples/jsm/modifiers/TessellateModifier.js'
import { MeshLineGeometry, MeshLineMaterial } from '@/plugins/meshline.js'
import GLLayer from './js/GLLayer'
import DongYuan from '/mock/dongyuanxian/dongyuan_polyline.json'
import { useMapStore } from '@/stores/map'

const mapStore = useMapStore()

class TerrainPolygonLayer extends GLLayer {
  // 边界区域的路径
  _data = []

  // 缓存顶部网格体的相关属性
  _topMeshProps = {}

  // 缓存侧边网格体的相关属性
  _sideMeshProps = {}

  // 边界线相关属性
  _edgeMeshProps = {}

  // CanvasTexture贴图的最大尺寸
  // 影响到贴图的清晰程度
  _CANVAS_MAX_LEN = 2000

  constructor(config) {
    const conf = {
      data: null,
      isStats: true,
      lineWidth: 100.0,
      lineColor: '#ffffff',
      sizeAttenuation: 1, // 线宽与镜头距离相关联
      ...config
    }
    super(conf)

    this.initData(this._conf.data)
  }

  animateAction() {
    if (this._edgeMesh) {
      this._edgeMesh.material.uniforms.offset.value.x -= 0.005
    }
  }

  async onReady() {
    // 计算包围盒
    this.initExtRange()
    // // 初始化顶部纹理
    await this.initTexture()
    // 创建顶部网格体
    this.createTopMesh()
    // 创建侧边网格体
    if (this._conf.altitude > 0) {
      this.createSideMesh({ height: this._conf.altitude })
    }
    // 边界线
    if (this._conf.lineWidth > 0) {
      this.createEdge()
    }
    // 增加方向光照
    this.initLight()
  }

  /**
   * 初始化边界范围盒子
   * @private
   */
  initExtRange() {
    const positions = this._data[0].path
    let minX = positions[0][0]
    let minY = positions[0][1]
    let maxX = positions[0][0]
    let maxY = positions[0][1]

    for (let i = 0; i < positions.length; i += 3) {
      const [x, y] = positions[i]
      if (x < minX) {
        minX = x
      } else if (x > maxX) {
        maxX = x
      }
      if (y < minY) {
        minY = y
      } else if (y > maxY) {
        maxY = y
      }
    }
    this._extRange = { minX, minY, maxX, maxY }
  }

  /**
   * 初始化顶部纹理
   * @private
   */
  async initTexture() {
    const topTextureArr = ['textureMap', 'normalMap', 'displacementMap']
    for (let i = 0; i < topTextureArr.length; i++) {
      const name = topTextureArr[i]
      const url = textureArr[`${name}URL`]
      const textureMap = new THREE.TextureLoader().load(url)
      textureMap.wrapS = THREE.RepeatWrapping // 在U方向（水平）平铺
      textureMap.wrapT = THREE.RepeatWrapping // 在V方向（垂直）平铺
      this._topMeshProps[name] = textureMap
    }

    // 透明度贴图
    this._topMeshProps.alphaMap = this.generateAlphaMap()

    // 侧边网格体
    const texture = await new THREE.TextureLoader().load(this._conf.sideTextureMapURL)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.offset.set(0, 1)
    this._sideMeshProps.textureMap = texture

    // 边界线
    const edgeTexture = await new THREE.TextureLoader().load(this._conf.edgeTextureMapURL)
    edgeTexture.wrapS = THREE.RepeatWrapping
    edgeTexture.wrapT = THREE.RepeatWrapping
    this._edgeMeshProps.textureMap = edgeTexture
  }

  /**
   * 创建顶部网格体
   * @private
   */
  createTopMesh() {
    const { textureMap, normalMap, displacementMap, alphaMap } = this._topMeshProps

    // 将纹理设置为sRGB颜色空间，以便正确显示颜色
    textureMap.encoding = THREE.sRGBEncoding

    // 标准材质
    const material = new THREE.MeshStandardMaterial({
      side: THREE.DoubleSide,
      map: textureMap, // 纹理贴图
      normalMap, // 法线贴图
      normalScale: new THREE.Vector2(this._conf.normalScale, this._conf.normalScale), // 法线贴图对材质的影响程度
      alphaMap, // 透明贴图
      displacementMap, // 位移贴图
      displacementScale: 5000, // 位移贴图对材质的影响程度
      displacementBias: 0, // 位移贴图偏移量
      wireframe: false, // 是否显示线框
      transparent: true, // 是否透明
      alphaTest: 0.1 // 设置alphaTest，可以设置一个阈值，低于这个阈值的像素将被丢弃
    })

    //
    const geometry = this.generateTopGeometry()

    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(0, 0, this._conf.altitude)

    this.scene.add(mesh)

    this._topMesh = mesh
  }

  /**
   * 创建侧面网格体
   * @private
   */
  createSideMesh({ height = 0, name }) {
    const arr = this._data[0].path
    const geometry = this.createSideGeometry(arr, { height })

    const material = new THREE.MeshBasicMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false, // 是否写入深度缓冲区
      map: this._sideMeshProps.textureMap
    })

    const mesh = new THREE.Mesh(geometry, material)
    this.scene.add(mesh)
    this._sideMesh = mesh
  }

  /**
   * 创建边界线
   * @private
   */
  createEdge() {
    const path = this._data[0].path
    const points = []
    path.forEach(([x, y]) => {
      points.push(new THREE.Vector3(x, y, this._conf.altitude + 20))
    })

    const line = new MeshLineGeometry()
    line.setPoints(points)

    const { sizeAttenuation, lineWidth, lineColor } = this._conf

    const material = new MeshLineMaterial({
      map: this._edgeMeshProps.textureMap,
      useMap: 1,
      // color: new THREE.Color(lineColor),
      opacity: 1,
      transparent: true,
      depthTest: true,
      sizeAttenuation: sizeAttenuation ? 1 : 0,
      lineWidth
    })
    const mesh = new THREE.Mesh(line, material)
    this.scene.add(mesh)

    this._edgeMesh = mesh
  }
  /**
   * 创建侧边几何体
   * @private
   */
  createSideGeometry(arr, { height }) {
    // 保持闭合路线
    if (arr[0].toString() !== arr[arr.length - 1].toString()) {
      arr.push(arr[0])
    }

    // 贴图纹理
    const vec3List = []
    let faceList = []
    let uvList = []

    const t0 = [0, 0]
    const t1 = [1, 0]
    const t2 = [1, 1]
    const t3 = [0, 1]

    for (let i = 0; i < arr.length; i++) {
      const [x, y] = arr[i]
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

    return geometry
  }

  /**
   * 通过边缘坐标数据获取灰度图纹理
   * @private
   */
  generateAlphaMap() {
    const polygonVertices = this._data[0].path.map(([x, y]) => {
      return new THREE.Vector3(x, y, 0)
    })

    // 行政区域的矩形范围
    const { minX, minY, maxX, maxY } = this._extRange

    // 计算缩放比例
    const maxDimension = Math.max(maxX - minX, maxY - minY)
    // 限制画布的最大宽和高
    const scale = this._CANVAS_MAX_LEN / maxDimension
    // 缩放多边形顶点的坐标
    const scaledVertices = polygonVertices.map((vertex) => {
      const x = (vertex.x - minX) * scale
      const y = (vertex.y - minY) * scale
      return new THREE.Vector3(x, y, vertex.z)
    })

    // 计算调整后的画布大小
    const width = Math.ceil((maxX - minX) * scale)
    const height = Math.ceil((maxY - minY) * scale)

    const canvas = this.generateCanvas({ width, height })
    const context = canvas.getContext('2d')
    // 绘制多边形
    context.fillStyle = '#000000' // 设置背景颜色为黑色
    context.fillRect(0, 0, width, height)
    context.fillStyle = '#FFFFFF' // 设置多边形颜色为白色
    context.beginPath()
    context.moveTo(scaledVertices[0].x, scaledVertices[0].y)
    for (let i = 1; i < scaledVertices.length; i++) {
      context.lineTo(scaledVertices[i].x, scaledVertices[i].y)
    }
    context.closePath()
    context.fill()

    return new THREE.CanvasTexture(canvas, null, THREE.RepeatWrapping, THREE.RepeatWrapping)
  }

  generateCanvas({ width, height }) {
    // 创建画布和上下文
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')

    // Canvas调整为与UV坐标系一致
    // 坐标垂直翻转，原点定位在左下角
    context.translate(0, height)
    context.scale(1, -1)
    return canvas
  }

  generateTopGeometry() {
    const { minX, minY, maxX, maxY } = this._extRange
    const coords = [
      [minX, minY],
      [minX, maxY],
      [maxX, maxY],
      [maxX, minY]
    ]

    // 创建多边形
    const path = new THREE.Shape()
    coords.forEach(([x, y], index) => {
      if (index === 0) {
        path.moveTo(x, y)
      } else {
        path.lineTo(x, y)
      }
    })

    // 创建几何体
    let geometry = new THREE.ShapeGeometry(path)

    // 细分出更多顶点
    const tessellateModifier = new TessellateModifier(0.1, 12)
    geometry = tessellateModifier.modify(geometry)

    // 创建 UV 属性并将其设置到几何体
    const uvArray = this.getGeometryUV(geometry)
    const uvAttribute = new THREE.BufferAttribute(uvArray, 2)
    geometry.setAttribute('uv', uvAttribute)

    return geometry
  }

  /**
   * 增加方向光照，使法线贴图产生效果
   */
  initLight() {
    const { intensity } = this._conf
    // 方向平行光
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0 * intensity)
    directionalLight.position.set(1, 1, 1)
    this.scene.add(directionalLight)
    // 环境光
    const light = new THREE.AmbientLight(0x404040, 2.0 * intensity)
    this.scene.add(light)
  }

  /**
   * 获取几何体归一化之后的UV坐标
   * @param geometry
   * @return {Float32Array}
   */
  getGeometryUV(geometry) {
    // 获取所有顶点数量
    const vertexCount = geometry.attributes.position.count
    // 创建 UV 坐标数组
    const uvArray = new Float32Array(vertexCount * 2)
    const { minX, minY, maxX, maxY } = this._extRange
    // 设置 UV 坐标
    for (let i = 0; i < vertexCount; i++) {
      const vertexIndex = i * 2
      // UV坐标归一化
      const u = (geometry.attributes.position.getX(i) - minX) / (maxX - minX)
      const v = (geometry.attributes.position.getY(i) - minY) / (maxY - minY)
      uvArray[vertexIndex] = u
      uvArray[vertexIndex + 1] = v
    }
    return uvArray
  }
  /**
   * 处理转换图层基础数据的地理坐标为空间坐标
   * @param geoJSON {JSON}
   * @private
   */
  initData(geoJSON) {
    const { features } = geoJSON
    features.forEach(({ geometry, properties }) => {
      switch (geometry.type) {
        case 'MultiPolygon':
          geometry.coordinates[0].forEach((item) => {
            this._data.push({
              path: this.customCoords.lngLatsToCoords(item),
              properties
            })
          })
          break
        case 'Polygon':
          this._data.push({
            path: this.customCoords.lngLatsToCoords(geometry.coordinates[0]),
            properties
          })
          break
        default:
          break
      }
    })
  }
}

const textureArr = {
  textureMapURL: `/mock/dongyuanxian/dongyuan_wx.jpg`, // 普通贴图
  normalMapURL: `/mock/dongyuanxian/dongyuan_normal.jpg`, // 法线贴图
  displacementMapURL: `/mock/dongyuanxian/dongyuan_dem2.jpg`, // 位移贴图
  sideTextureMapURL: `/public/texture/texture_cake_1.png`, // 侧面的贴图
  edgeTextureMapURL: `/public/texture/spriteLine.png` // 边缘的贴图
}

const config = {
  map: null,
  data: DongYuan,
  normalScale: 3.0, // 法线贴图对材质的影响程度
  intensity: 5.0, // 光照强度
  altitude: 3000,
  ...textureArr
}

const initLayer = () => {
  const map = mapStore.getMap()
  map.setCenter([114.87183, 23.931571])
  map.setPitch(60)
  config.map = map
  new TerrainPolygonLayer(config)
}
</script>

<template>
  <operate-box>
    <a-button type="primary" @click="initLayer">加载3D地形</a-button>
  </operate-box>
</template>

<style scoped></style>
