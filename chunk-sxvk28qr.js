import{h as z,i as A}from"./chunk-100j7rtj.js";import{V as v,Z as w}from"./chunk-6x2z9e4g.js";import"./chunk-zr9fqmm5.js";import"./chunk-tk9ja8wq.js";import"./chunk-w7g6ex7j.js";import"./chunk-g1z8560d.js";import"./chunk-mf99b6ep.js";import"./chunk-fez5n38c.js";import"./chunk-4f4cca1x.js";import"./chunk-mr1mg9nw.js";import"./chunk-pt38skrx.js";import"./chunk-wnpf0mxd.js";import"./chunk-cf2anp2z.js";import"./chunk-9cv6hrcp.js";import"./chunk-bnedmxya.js";function $(k){return k.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}class C extends w{isCompatible(k){switch(k){case v.WGSL:return!0;default:return!1}}getCustomCode(k){if(k==="vertex"){let t={};return t.CUSTOM_VERTEX_DEFINITIONS=z,t[`!${$("finalWorld=finalWorld*influence;")}`]=`
${A}
finalWorld=(finalWorld*influence);
`,t}if(k==="fragment"){let t={};t.CUSTOM_FRAGMENT_DEFINITIONS=`
#if defined(SPHERE_TEXTURE) && defined(NORMAL)
var sphereSamplerSampler: sampler;var sphereSampler: texture_2d<f32>;
#endif
#ifdef TOON_TEXTURE
var toonSamplerSampler: sampler;var toonSampler: texture_2d<f32>;
#endif
`,t.CUSTOM_FRAGMENT_MAIN_BEGIN=`
#ifdef TOON_TEXTURE
var toonNdl: vec3f;
#endif
`,t[`!${$("var diffuseColor: vec3f=uniforms.vDiffuseColor.rgb;")}`]=`
#ifdef APPLY_AMBIENT_COLOR_TO_DIFFUSE
var diffuseColor: vec3f=clamp(uniforms.vDiffuseColor.rgb+uniforms.vAmbientColor,vec3f(0.0),vec3f(1.0));
#else
var diffuseColor: vec3f=(uniforms.vDiffuseColor.rgb);
#endif
`,t[`!${$("var alpha: f32=uniforms.vDiffuseColor.a;")}`]=`
#ifdef CLAMP_ALPHA
var alpha: f32=clamp(uniforms.vDiffuseColor.a,0.0,1.0);
#else
var alpha: f32=uniforms.vDiffuseColor.a;
#endif
`,t[`!${$("baseColor=textureSample(diffuseSampler,diffuseSamplerSampler,fragmentInputs.vDiffuseUV+uvOffset);")}`]=`
#if defined(DIFFUSE) && defined(TEXTURE_COLOR)
baseColor=textureSample(diffuseSampler,diffuseSamplerSampler,(fragmentInputs.vDiffuseUV+uvOffset));baseColor=vec4f(
mix(
vec3f(1.0),
baseColor.rgb*uniforms.textureMultiplicativeColor.rgb,
uniforms.textureMultiplicativeColor.a
),
baseColor.a
);baseColor=vec4f(
clamp(
baseColor.rgb+(baseColor.rgb-vec3f(1.0))*uniforms.textureAdditiveColor.a,
vec3f(0.0),
vec3f(1.0)
)+uniforms.textureAdditiveColor.rgb,
baseColor.a
);
#else
baseColor=textureSample(diffuseSampler,diffuseSamplerSampler,(fragmentInputs.vDiffuseUV+uvOffset));
#endif
`,t[`!${$(`struct lightingInfo
{`)}`]=`
struct lightingInfo {
#ifdef TOON_TEXTURE
#ifndef NDOTL
ndl: f32,
#endif
isToon: f32,
#endif
`,t[`!${$("result.diffuse=ndl*diffuseColor*attenuation;")}`]=`
#ifdef TOON_TEXTURE
result.diffuse=diffuseColor*attenuation;result.ndl=ndl;result.isToon=1.0;
#elif defined(IGNORE_DIFFUSE_WHEN_TOON_TEXTURE_DISABLED)
result.diffuse=diffuseColor*attenuation;
#else
result.diffuse=(ndl*diffuseColor*attenuation);
#endif
`,t[`!${$("diffuseBase+=info.diffuse*shadow;")}`]=`
#ifdef TOON_TEXTURE
toonNdl=vec3f(clamp(info.ndl*shadow,0.02,0.98));toonNdl.r=textureSample(toonSampler,toonSamplerSampler,vec2f(0.5,toonNdl.r)).r;toonNdl.g=textureSample(toonSampler,toonSamplerSampler,vec2f(0.5,toonNdl.g)).g;toonNdl.b=textureSample(toonSampler,toonSamplerSampler,vec2f(0.5,toonNdl.b)).b;
#ifdef TOON_TEXTURE_COLOR
toonNdl=mix(
vec3f(1.0),
toonNdl*uniforms.toonTextureMultiplicativeColor.rgb,
uniforms.toonTextureMultiplicativeColor.a
);toonNdl=clamp(
toonNdl+(toonNdl-vec3f(1.0))*uniforms.toonTextureAdditiveColor.a,
vec3f(0.0),
vec3f(1.0)
)+uniforms.toonTextureAdditiveColor.rgb;
#endif
diffuseBase+=mix(info.diffuse*shadow,toonNdl*info.diffuse,info.isToon);
#elif defined(IGNORE_DIFFUSE_WHEN_TOON_TEXTURE_DISABLED)
diffuseBase+=info.diffuse;
#else
diffuseBase+=(info.diffuse*shadow);
#endif
`;let q=`
#ifdef EMISSIVEASILLUMINATION
var finalDiffuse: vec3f=clamp(diffuseBase*diffuseColor+uniforms.vAmbientColor,vec3f(0.0),vec3f(1.0))*baseColor.rgb;
#else
#ifdef LINKEMISSIVEWITHDIFFUSE
var finalDiffuse: vec3f=clamp((diffuseBase+emissiveColor)*diffuseColor+uniforms.vAmbientColor,vec3f(0.0),vec3f(1.0))*baseColor.rgb;
#else
var finalDiffuse: vec3f=clamp(diffuseBase*diffuseColor+emissiveColor+uniforms.vAmbientColor,vec3f(0.0),vec3f(1.0))*baseColor.rgb;
#endif
#endif
`;return t[`!${$(q)}`]=`
#ifdef APPLY_AMBIENT_COLOR_TO_DIFFUSE
#ifdef EMISSIVEASILLUMINATION
var finalDiffuse: vec3f=clamp(diffuseBase*diffuseColor,vec3f(0.0),vec3f(1.0))*baseColor.rgb;
#else
#ifdef LINKEMISSIVEWITHDIFFUSE
var finalDiffuse: vec3f=clamp((diffuseBase+emissiveColor)*diffuseColor,vec3f(0.0),vec3f(1.0))*baseColor.rgb;
#else
var finalDiffuse: vec3f=clamp(diffuseBase*diffuseColor+emissiveColor,vec3f(0.0),vec3f(1.0))*baseColor.rgb;
#endif
#endif
#else
${q.replace("diffuseBase","(diffuseBase)")}#endif
`,t.CUSTOM_FRAGMENT_BEFORE_FOG=`
#if defined(NORMAL) && defined(SPHERE_TEXTURE)
var viewSpaceNormal: vec3f=normalize(mat3x3f(scene.view[0].xyz,scene.view[1].xyz,scene.view[2].xyz)*fragmentInputs.vNormalW);var sphereUV: vec2f=viewSpaceNormal.xy*0.5+0.5;var sphereReflectionColor: vec4f=textureSample(sphereSampler,sphereSamplerSampler,sphereUV);
#ifdef SPHERE_TEXTURE_COLOR
sphereReflectionColor=vec4f(
mix(
vec3f(1.0),
sphereReflectionColor.rgb*uniforms.sphereTextureMultiplicativeColor.rgb,
uniforms.sphereTextureMultiplicativeColor.a
),
sphereReflectionColor.a
);sphereReflectionColor=vec4f(
clamp(
sphereReflectionColor.rgb+(sphereReflectionColor.rgb-vec3f(1.0))*uniforms.sphereTextureAdditiveColor.a,
vec3f(0.0),
vec3f(1.0)
)+uniforms.sphereTextureAdditiveColor.rgb,
sphereReflectionColor.a
);
#endif
sphereReflectionColor=vec4f(sphereReflectionColor.rgb*diffuseBase,sphereReflectionColor.a);
#ifdef SPHERE_TEXTURE_BLEND_MODE_MULTIPLY
color*=sphereReflectionColor;
#elif defined(SPHERE_TEXTURE_BLEND_MODE_ADD)
color=vec4f(color.rgb+sphereReflectionColor.rgb,color.a);
#endif
#endif
`,t}return null}}export{C as MmdPluginMaterial};

//# debugId=6821C0E24B59EC9564756E2164756E21
//# sourceMappingURL=chunk-sxvk28qr.js.map
