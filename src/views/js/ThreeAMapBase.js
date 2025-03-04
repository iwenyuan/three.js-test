import * as THREE from 'three'

import Stats from 'three/examples/jsm/libs/stats.module.js'

export default class ThreeAMapBase {
  constructor(config) {
    this._conf = {
      ...config
    }
    this.isStats = false
  }

  // 绘制
  createChart() {}

  // 渲染动画
  animateAction() {}

  init(map) {
    this.map = map
    this.container = map.getContainer()
    // 数据转换工具,经纬度坐标转空间坐标
    this.customCoords = this.map.customCoords
    // 加载器
    THREE.Cache.enabled = true

    // 创建GL图层
    this.glLayer = new AMap.GLCustomLayer({
      init: (gl) => {
        this.initThree(gl)
        this.createChart()
        this.animate()
      },
      render: () => {
        // 固定写法，参考高德示例
        // 这里必须执行！！重新设置 three 的 gl 上下文状态。
        this.renderer.resetState()
        //设置坐标转换中心
        var { near, far, fov, up, lookAt, position } = this.customCoords.getCameraParams()

        // 这里的顺序不能颠倒，否则可能会出现绘制卡顿的效果。
        this.camera.near = near
        this.camera.far = far
        this.camera.fov = fov
        this.camera.position.set(...position)
        this.camera.up.set(...up)
        this.camera.lookAt(...lookAt)
        this.camera.updateProjectionMatrix()

        //渲染器渲染场景
        this.renderer.render(this.scene, this.camera)

        // 这里必须执行！！重新设置 three 的 gl 上下文状态。
        this.renderer.resetState()
      }
    })

    this.map.add(this.glLayer)

    window.addEventListener('resize', this.onResize.bind(this))
    window.addEventListener('unload', this.clearAll.bind(this))
  }

  initThree(gl) {
    this.camera = new THREE.PerspectiveCamera(
      60,
      this.container.offsetWidth / this.container.offsetHeight,
      1,
      1 << 30
    )

    this.scene = new THREE.Scene()

    this.renderer = new THREE.WebGLRenderer({
      context: gl,
      antialias: true // 抗锯齿
    })

    // 自动清空画布这里必须设置为 false，否则地图底图将无法显示
    this.renderer.autoClear = false

    // 如果不添加灯光，材质为黑色
    // 环境光 (颜色,强度)
    const light = new THREE.AmbientLight(0xffffff, 1)
    this.scene.add(light)

    // 性能监视器
    if (this.isStats) {
      this.stats = new Stats()
      this.stats.dom.style.position = 'absolute'
      this.stats.dom.style.top = '0px'
      this.stats.dom.style.left = ''
      this.stats.dom.style.right = '0px'
      this.container.appendChild(this.stats.dom)
    }
  }

  onResize() {
    if (this.container) {
      this.camera.aspect = this.container.offsetWidth / this.container.offsetHeight
      this.camera.updateProjectionMatrix() // 更新摄像机投影矩阵。在任何参数被改变以后必须被调用。
      this.renderer.setSize(this.container.offsetWidth, this.container.offsetHeight)
    }
  }

  animate() {
    if (this.isStats && this.stats) {
      this.stats.update()
    }

    this.animateAction()

    this.map.render()

    this.animationFrameId = requestAnimationFrame(this.animate.bind(this))
  }

  clearAll() {
    this.animationFrameId && cancelAnimationFrame(this.animationFrameId)

    if (this.stats) {
      this.container.removeChild(this.stats.domElement)
      this.stats = null
    }

    this.map.remove(this.glLayer)

    this.clearEle(this.scene)
  }

  clearObj(scene) {
    this.clearEle(scene)
    scene?.parent?.remove && scene.parent.remove(scene)
  }

  clearEle(scene) {
    if (scene) {
      if (scene.children && scene.children.length > 0) {
        this.cleanNext(scene, 0)
        scene.remove(...scene.children)
      }
      if (scene.geometry) {
        scene.geometry.dispose && scene.geometry.dispose()
      }
      if (scene instanceof THREE.Material) {
        for (const v of Object.values(scene)) {
          if (v instanceof THREE.Texture) {
            v.dispose && v.dispose()
          }
        }

        scene.dispose && scene.dispose()
      }
      if (Array.isArray(scene)) {
        scene.material.forEach((m) => {
          this.clearEle(m)
        })
      }
    }
  }

  cleanNext(scene, idx) {
    if (idx < scene.children.length) {
      this.clearEle(scene.children[idx])
    }
    if (idx + 1 < scene.children.length) {
      this.cleanNext(scene, idx + 1)
    }
  }
}
