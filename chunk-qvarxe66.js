import{Lc as k}from"./chunk-284eakdn.js";var q="sceneUboDeclaration",A=`layout(std140,column_major) uniform;uniform Scene {mat4 viewProjection;
#ifdef MULTIVIEW
mat4 viewProjectionR;
#endif 
mat4 view;mat4 projection;vec4 vEyePosition;mat4 inverseProjection;};
`;if(!k.IncludesShadersStore[q])k.IncludesShadersStore[q]=A;var I={name:q,shader:A};var v="meshUboDeclaration",B=`#ifdef WEBGL2
uniform mat4 world;uniform float visibility;
#else
layout(std140,column_major) uniform;uniform Mesh
{mat4 world;float visibility;};
#endif
#define WORLD_UBO
`;if(!k.IncludesShadersStore[v])k.IncludesShadersStore[v]=B;var N={name:v,shader:B};var w="defaultUboDeclaration",C=`layout(std140,column_major) uniform;uniform Material
{vec4 diffuseLeftColor;vec4 diffuseRightColor;vec4 opacityParts;vec4 reflectionLeftColor;vec4 reflectionRightColor;vec4 refractionLeftColor;vec4 refractionRightColor;vec4 emissiveLeftColor;vec4 emissiveRightColor;vec2 vDiffuseInfos;vec2 vAmbientInfos;vec2 vOpacityInfos;vec2 vEmissiveInfos;vec2 vLightmapInfos;vec2 vSpecularInfos;vec3 vBumpInfos;mat4 diffuseMatrix;mat4 ambientMatrix;mat4 opacityMatrix;mat4 emissiveMatrix;mat4 lightmapMatrix;mat4 specularMatrix;mat4 bumpMatrix;vec2 vTangentSpaceParams;float pointSize;float alphaCutOff;mat4 refractionMatrix;vec4 vRefractionInfos;vec3 vRefractionPosition;vec3 vRefractionSize;vec4 vSpecularColor;vec3 vEmissiveColor;vec4 vDiffuseColor;vec3 vAmbientColor;vec4 cameraInfo;vec4 vTextureRepetitionHexTilingParams;vec2 vReflectionInfos;mat4 reflectionMatrix;vec3 vReflectionPosition;vec3 vReflectionSize;
#define ADDITIONAL_UBO_DECLARATION
};
#include<sceneUboDeclaration>
#include<meshUboDeclaration>
`;if(!k.IncludesShadersStore[w])k.IncludesShadersStore[w]=C;var W={name:w,shader:C};var x="mainUVVaryingDeclaration",F=`#ifdef MAINUV{X}
varying vec2 vMainUV{X};
#endif
`;if(!k.IncludesShadersStore[x])k.IncludesShadersStore[x]=F;var Z={name:x,shader:F};var z="logDepthDeclaration",G=`#ifdef LOGARITHMICDEPTH
uniform float logarithmicDepthConstant;varying float vFragmentDepth;
#endif
`;if(!k.IncludesShadersStore[z])k.IncludesShadersStore[z]=G;var f={name:z,shader:G};
export{I as V,N as W,W as X,Z as Y,f as Z};

//# debugId=77A3E88B0F9B294A64756E2164756E21
//# sourceMappingURL=chunk-qvarxe66.js.map
