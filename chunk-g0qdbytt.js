import{Lc as b}from"./chunk-284eakdn.js";import"./chunk-vth2vbh3.js";var k="lodPixelShader",q=`precision highp float;const float GammaEncodePowerApprox=1.0/2.2;varying vec2 vUV;uniform sampler2D textureSampler;uniform float lod;uniform vec2 texSize;uniform int gamma;void main(void)
{ivec2 textureDimensions=textureSize(textureSampler,0);gl_FragColor=texelFetch(textureSampler,ivec2(vUV*vec2(textureDimensions)),int(lod));if (gamma==0) {gl_FragColor.rgb=pow(gl_FragColor.rgb,vec3(GammaEncodePowerApprox));}}
`;if(!b.ShadersStore[k])b.ShadersStore[k]=q;var w={name:k,shader:q};export{w as lodPixelShader};

//# debugId=94D92256227DA10764756E2164756E21
//# sourceMappingURL=chunk-g0qdbytt.js.map
