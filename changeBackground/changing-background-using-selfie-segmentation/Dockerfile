# 使用官方的 Nginx 镜像作为基础镜像
FROM nginx:latest

# 将本地的网页目录拷贝到容器的 Nginx 默认网页目录
COPY ./dist /usr/share/nginx/html

# 暴露 Nginx 默认端口 80
EXPOSE 80

# 启动 Nginx 服务器
CMD ["nginx", "-g", "daemon off;"]
