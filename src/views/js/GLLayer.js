import * as THREE from 'three'

import Stats from 'three/examples/jsm/libs/stats.module.js'

export default class ThreeAMapBase {
  constructor(config) {
    this._conf = {
      ...config
    }
    this.isStats = this._conf.isStats

    this.map = this._conf.map
    this.container = config.container || this.map.getContainer()
    this.customCoords = this.map.customCoords

    this.prepare()
  }

  async prepare() {
    await this.initLayer()
    this.addStats()
    this.onReady()
    this.addModuleListener()
    this.animate()
  }

  createChart() {}

  /**
   * @abstract
   * @description 每次渲染时执行
   */
  animateAction() {}

  addModuleListener() {
    window.addEventListener('resize', this.resizeLayer.bind(this))
  }

  resizeLayer() {
    if (this.container) {
      const { offsetWidth, offsetHeight } = this.container
      this.camera.aspect = offsetWidth / offsetHeight
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(offsetWidth, offsetHeight)
    }
  }

  /**
   * @abstract
   * @description GLCustomLayer已经准备好时执行,需要子类覆盖
   */
  onReady() {
    throw Error('该方法只能被子类重写')
  }

  async initLayer() {
    this.layer = await this.createGlCustomLayer()
  }

  /**
   * 创建非独立图层
   * @return  {AMap.GlCustomLayer}
   */
  createGlCustomLayer() {
    return new Promise((resolve) => {
      const layer = new AMap.GLCustomLayer({
        zIndex: this._conf.zIndex,
        visible: true, // 设置为true时才会执行init
        init: (gl) => {
          this.initThree(gl)
          resolve(layer)
        },
        render: (gl) => {
          this.updateCamera()
        }
      })
      this.map.add(layer)
    })
  }

  initThree(gl) {
    const { offsetWidth, offsetHeight } = this.container
    this.camera = new THREE.PerspectiveCamera(60, offsetWidth / offsetHeight, 100, 1 << 30)

    this.scene = new THREE.Scene()

    // const { antialias, precision } = this._conf.renderOption
    const option = {
      alpha: true
      //   antialias,
      //   precision
    }
    option.context = gl

    const renderer = new THREE.WebGLRenderer(option)
    // 必须设置为false才能实现多个render的叠加
    renderer.autoClear = false
    renderer.setClearAlpha(0)
    renderer.setSize(offsetWidth, offsetHeight)
    renderer.setPixelRatio(window.devicePixelRatio)

    this.renderer = renderer
  }

  /**
   * 性能监视器
   */
  addStats() {
    if (this.isStats) {
      this.stats = new Stats()
      this.stats.dom.style.position = 'absolute'
      this.stats.dom.style.top = '0px'
      this.stats.dom.style.left = ''
      this.stats.dom.style.right = '0px'
      this.container.appendChild(this.stats.dom)
    }
  }

  updateCamera() {
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

    this.clearEle(this.scene)
  }

  clearObj(scene) {
    this.clearEle(scene)
    obj?.parent?.remove && obj.parent.remove(obj)
  }

  clearEle(scene) {
    if (scene) {
      if (obj.children && obj.children.length > 0) {
        this.cleanNext(obj, 0)
        obj.remove(...obj.children)
      }
      if (obj.geometry) {
        obj.geometry.dispose && obj.geometry.dispose()
      }
      if (obj instanceof THREE.Material) {
        for (const v of Object.values(obj)) {
          if (v instanceof THREE.Texture) {
            v.dispose && v.dispose()
          }
        }

        obj.dispose && obj.dispose()
      }
      if (Array.isArray(obj)) {
        obj.material.forEach((m) => {
          this.clearEle(m)
        })
      }
    }
  }

  cleanNext(obj, idx) {
    if (idx < obj.children.length) {
      this.clearEle(obj.children[idx])
    }
    if (idx + 1 < obj.children.length) {
      this.cleanNext(obj, idx + 1)
    }
  }
}
