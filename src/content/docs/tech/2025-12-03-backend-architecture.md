---
title: SkillStream 后端技术架构解析
description: 剖析 SkillStream 在线教育平台的后端技术选型、架构设计与核心实现细节。
date: 2025-12-03
tags: ["Spring Boot", "Java", "PostgreSQL", "Architecture", "Backend", "技术"]
---

最近接了一个项目，项目是要做一个在线教育平台，项目大量使用AI生成后端代码。但由于工期很紧，所以基本没有时间去深入了解AI生成的代码，本文现在就是在对AI生成的后端代码进行分析，整理成我的学习笔记。

## 1. 核心基座：Spring Boot 3.4 + Java 21

本项目采用了 Java 生态技术组合：

| 技术组件 | 版本 | 核心优势 (我的理解) |
| :--- | :--- | :--- |
| **Java** | **21 (LTS)** | 选它主要是因为它是最新的长期支持版本 (LTS)，用新不用旧，稳妥。 |
| **Spring Boot** | **3.4.9** | 也是一样的道理，选个比较新的稳定版本，避免以后升级麻烦。 |

## 2. 数据层：PostgreSQL + MyBatis + Druid

数据层是系统的基石，我们选择了“稳健 + 灵活”的组合：

### 2.1 PostgreSQL (数据库)
*   **选型理由**：
    *   **MySQL 口碑下滑**：最近几年 MySQL 因为 Oracle 的原因，社区活跃度和口碑都有点下滑。
    *   **PGSQL 势头强劲**：PostgreSQL 开源社区非常活跃，扩展能力极强，性能也很能打，是目前更好的选择。

### 2.2 MyBatis (ORM 框架)
*   **选型理由**：Java 代码与 SQL 语句之间的桥梁。
*   **核心价值**：
    *   **SQL Provider 模式**：本项目没有使用传统的 XML，也没有在接口上写长长的 SQL 注解，而是使用了 **`@SelectProvider` + Java SQL Builder** 的模式。
    *   **优势**：SQL 语句用 Java 代码写（`new SQL().SELECT().FROM()...`），既避免了 XML 的繁琐，又比字符串拼接更优雅，还能利用 Java 的逻辑控制（if/else）动态拼接 SQL。
    ```java
    // 1. 接口定义 (Dao)
    @SelectProvider(type = AnnouncementSql.class, method = "getAnnouncementList")
    List<Announcement> getList(@Param("keyword") String keyword);

    // 2. SQL 构建类 (Sql Provider)
    public String getAnnouncementList(Map<String, Object> params) {
        return new SQL() {{
            SELECT("*");
            FROM("tb_announcement");
            if (params.get("keyword") != null) {
                WHERE("title LIKE #{keyword}");
            }
        }}.toString();
    }
    ```

### 2.3 Druid (连接池)
*   **选型理由**：阿里巴巴开源的高性能数据库连接池。
*   **核心价值**：国内 Java 项目的标配。
*   **配置示例**：
    在 `application-prod.yml` 中，我们可以看到 Druid 的详细配置：
    ```yaml
    spring:
      datasource:
        type: com.alibaba.druid.pool.DruidDataSource
        druid:
          initial-size: 5     # 初始连接数
          min-idle: 5         # 最小空闲数
          max-active: 20      # 最大连接数
          test-while-idle: true # 检查一下还能不能用
    ```

### 2.4 它们是怎么串起来的？(自动装配)
靠 **Spring Boot 的自动装配 (Auto Configuration)**。

1.  **Druid -> 数据库**：
    *   Spring Boot 看到 `spring.datasource.type: ...DruidDataSource`，就会自动创建一个 Druid 连接池对象。
    *   然后把 `url`, `username`, `password` 喂给这个对象，连接池就建立好了。

2.  **MyBatis -> Druid**：
    *   `mybatis-spring-boot-starter` 发现容器里有一个做好的 DataSource (就是上面的 Druid)，就会自动把它拿过来。
    *   MyBatis 说：“以后我要查数据库，就找你借连接。”

**总结**：在 Spring Boot 里，只要依赖加对了（pom.xml），配置写对了（application.yml），它们就会自动“相亲”成功，不需要写一行 Java 代码来手动组装。

> **小贴士：如果是多数据库怎么办？**
>
> **场景 1：固定多数据源 (比如主从库)**
> 需要手动配置两个 DataSource Bean。
>
> ```java
> @Configuration
> public class DataSourceConfig {
>
>     // 1. 主数据源 (写库)
>     @Bean(name = "masterDataSource")
>     @Primary // 遇到冲突时，默认用这个
>     @ConfigurationProperties(prefix = "spring.datasource.master")
>     public DataSource masterDataSource() {
>         return DataSourceBuilder.create().build();
>     }
>
>     // 2. 从数据源 (读库)
>     @Bean(name = "slaveDataSource")
>     @ConfigurationProperties(prefix = "spring.datasource.slave")
>     public DataSource slaveDataSource() {
>         return DataSourceBuilder.create().build();
>     }
> }
>
> // 3. 使用示例
> @Service
> public class UserService {
>     @Autowired
>     private DataSource masterDataSource; // 自动注入主库 (因为有 @Primary)
>
>     @Autowired
>     @Qualifier("slaveDataSource") // 显式指定注入从库
>     private DataSource slaveDataSource;
> }
> ```

## 3. 安全层：Spring Security + JWT

安全是教育平台的生命线，我们采用了一套标准的无状态认证方案。

### 3.1 Spring Security
*   **作用**：负责拦截所有进入系统的请求。
*   **职责**：
    *   **认证 (Authentication)**：你是谁？（检查用户名密码）
    *   **授权 (Authorization)**：你能干什么？（检查是否有管理员权限）

### 3.2 JWT (身份令牌)
*   **机制**：无状态认证。
*   **流程**：
    1.  用户登录成功。
    2.  后端生成一个加密字符串 (Token)，里面包含了用户 ID 和角色。
    3.  前端拿到 Token 存起来。
    4.  以后每次发请求，都在 Header 里带上这个 Token。
*   **优势**：服务端不需要在内存里存 Session，天然支持分布式部署。
*   **思考：Token 需要存吗？**
    *   **纯 JWT 模式 (当前项目)**：服务端**完全不存** Token。只负责签发和验签。
        *   *优点*：极速，数据库/Redis 挂了都不影响验证（只要算法对就行）。
        *   *缺点*：**无法强制下线**。一旦 Token 发出去，在过期前它永远有效。如果用户手机丢了，想远程踢下线，做不到。
    *   **JWT + Redis 模式 (进阶)**：
        *   登录时：生成 Token，同时存入 Redis (Key=userId, Value=token, TTL=24h)。
        *   验证时：先验签名，再去 Redis 查“这个用户现在的 Token 是不是我手里这个”。
        *   *价值*：实现了**分布式**且**可控**的会话管理。想踢谁，删 Redis 里的 Key 就行。
*   **代码实现示例**：
    核心是一个过滤器 `JwtAuthenticationFilter`，它会拦截每一个请求：
    ```java
    @Component
    public class JwtAuthenticationFilter extends OncePerRequestFilter {
        @Autowired
        private JwtUtils jwtUtils;

        @Override
        protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
                throws ServletException, IOException {
            
            // 1. 从请求头拿 Token (Authorization: Bearer xxxxx)
            String token = request.getHeader("Authorization");
            
            // 2. 验证 Token 是否合法
            if (token != null && jwtUtils.validateToken(token)) {
                // 3. 从 Token 里解析出用户名
                String username = jwtUtils.getUsernameFromToken(token);
                
                // 4. 告诉 Spring Security：这个人已登录，放行！
                UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(username, null, authorities);
                SecurityContextHolder.getContext().setAuthentication(auth);
            }
            
            // 5. 继续下一个过滤器
            // 注意：如果 Token 不合法，上面的 if 没进去，SecurityContext 里就是空的。
            // Spring Security 后面的过滤器发现它是空的，就会自动抛出 401/403 错误，不需要我们手动写 else。
            chain.doFilter(request, response);
        }
    }
    ```
*   **登录生成 Token 示例**：
    当用户输入账号密码，验证通过后，后端会签发一个 Token：
    ```java
    // AuthController.java
    @PostMapping("/login")
    public String login(@RequestBody LoginRequest loginRequest) {
        // 1. 校验账号密码 (Spring Security 帮忙做)
        // UsernamePasswordAuthenticationToken 是 Spring Security 自带的类，用来封装账号密码
        // 注意：authenticate() 方法内部会自动调用我们写的 UserDetailsServiceImpl 去数据库查密码
        // 如果密码不对，这里直接抛异常，不会往下走
        Authentication authentication = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(loginRequest.getUsername(), loginRequest.getPassword())
        );

        // 2. 认证成功，生成 Token
        // 这里的 secretKey 是保密的，千万不能泄露给前端！
        String token = Jwts.builder()
                .setSubject(loginRequest.getUsername()) // 把用户名存进去
                .claim("userId", 1001)                  // 存用户ID
                .claim("role", "admin")                 // 存角色
                .setIssuedAt(new Date())                // 签发时间
                .setExpiration(new Date(System.currentTimeMillis() + 86400000)) // 24小时后过期
                .signWith(SignatureAlgorithm.HS512, "MySecretKey") // 签名算法
                .compact();

        // 3. 把 Token 返回给前端
        return token;
    }
    ```


### 3.3 认证流程解密：它是怎么查数据库的？

您可能会好奇：`authenticationManager.authenticate()` 这一行代码到底干了什么？它是怎么知道密码对不对的？

其实，Spring Security 背后依赖一个核心接口 **`UserDetailsService`**。我们需要自己实现这个接口，告诉框架“去哪里查用户”。

**完整流程如下**：

1.  **Controller 层**：调用 `authenticate()`。
2.  **框架内部**：自动调用我们实现的 `UserDetailsServiceImpl.loadUserByUsername()`。
3.  **Service 层**：去数据库查询用户信息（包含加密后的密码）。
4.  **框架内部**：拿着数据库查出来的密码，和用户输入的密码（经过加密后）进行比对。

**代码示例 (`UserDetailsServiceImpl.java`)**：

```java
@Service
public class UserDetailsServiceImpl implements UserDetailsService {

    @Autowired
    private UserMapper userMapper;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        // 1. 去数据库查用户
        User user = userMapper.selectByUsername(username);
        if (user == null) {
            throw new UsernameNotFoundException("用户不存在");
        }

        // 2. 把数据库里的 User 转换成 Spring Security 需要的 UserDetails 对象
        // 这里的 user.getPassword() 是数据库里的加密密码
        return new org.springframework.security.core.userdetails.User(
                user.getUsername(),
                user.getPassword(),
                Collections.singletonList(new SimpleGrantedAuthority(user.getRole()))
        );
    }
}
```

### 3.4 权限控制与用户身份获取

**1. 谁能访问什么接口？(`SecurityConfig.java`)**

在 `SecurityConfig` 类中，我们定义了“门禁规则”：

```java
@Bean
public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http
        // ...
        .authorizeHttpRequests(authz -> authz
            // 这些接口是公开的，谁都能访问 (白名单)
            .requestMatchers(
                "/api/v1/auth/login",    // 登录
                "/api/v1/auth/register", // 注册
                "/doc.html"              // 接口文档
            ).permitAll()
            
            // 除了上面列出来的，其他所有接口都必须登录才能访问！
            .anyRequest().authenticated()
        )
        // ...
}
```
*   **`permitAll()`**：放行。
*   **`authenticated()`**：必须携带有效的 Token 才能访问。

**2. Controller 里怎么知道是谁在操作？**

当请求通过了拦截器进入 Controller 后，我们不需要再去解析 Token，直接用 **`@AuthenticationPrincipal`** 注解就能拿到当前用户信息：

```java
@PostMapping("/api/v1/auth/user")
public ResultResponse<String> getUser(
    // 魔法注解：自动注入当前登录用户对象
    @AuthenticationPrincipal CustomUserDetails userDetails
) {
    // 直接获取用户ID
    Long userId = userDetails.getId();
    // 获取用户名
    String username = userDetails.getUsername();
    
    // ... 业务逻辑
}
```
*   **原理**：还记得 `JwtAuthenticationFilter` 里我们调用了 `SecurityContextHolder.getContext().setAuthentication(...)` 吗？这个注解就是从那里把数据取出来的。

**3. 只有管理员能访问？(`@PreAuthorize`)**

除了全局配置，我们还可以在 Controller 的方法上加注解，实现更细粒度的权限控制：

```java
// 只有拥有 ADMIN 角色的用户才能调用
@PreAuthorize("hasRole('ADMIN')")
@PostMapping("/deleteUser")
public void deleteUser() { ... }

// 只要是 老师 或者 管理员 都能调用
@PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
@GetMapping("/class/list")
public List<Class> listClasses() { ... }
```
*   **`hasRole('ADMIN')`**：必须是管理员。
*   **`hasAnyRole(...)`**：只要满足其中一个角色即可。
*   **注意**：这需要 `SecurityConfig` 里开启 `@EnableMethodSecurity(prePostEnabled = true)`。

## 4. 架构设计：模块化分层 (Package by Feature)

项目结构没有采用传统的“按层划分”（所有 Controller 放在一起），而是采用了更先进的 **“按功能划分”**：

*   **`com.company.skillStream.business` (核心业务)**：
    *   **设计**：将 User、Video、Exam 等不同业务模块的代码（Controller、Service、Mapper）聚合在一起。
    *   **好处**：**高内聚**。当你要改“视频”功能时，所有相关代码都在一个包里，不用满世界找文件。
*   **`com.company.skillStream.aop` (切面编程)**：
    *   **作用**：把“脏活累活”抽离出来，统一处理。
    *   **现有实现**：
        1.  **`GlobalExceptionHandler`**：全局异常处理。不管哪里抛了错，最后都由它兜底，返回统一的 JSON 格式（如 `{"code": 500, "msg": "服务器内部错误"}`）。
        2.  **`LogAspect`**：操作日志。专门拦截 `AuthApiController` 里的登录请求，记录谁在什么时候登录了系统。
        3.  **`DecryptAspect`**：请求解密。
            *   **注意**：代码里虽然有这个功能（支持 RSA 解密），但我看 Controller 里的 `@Decrypt` 注解目前都被**注释掉**了（`// @Decrypt`）。
            *   这说明目前前后端交互暂时用的是明文，可能是为了开发调试方便，还没开启加密。
*   **`com.company.skillStream.tasks` (定时任务)**：
    *   **作用**：处理后台自动化任务。
    *   **现有实现**：
        1.  **`OrphanFileCleanupTask`**：孤儿文件清理。
            *   **逻辑**：每天凌晨 3 点执行 (`@Scheduled(cron = "0 0 3 * * ?")`)。
            *   **目的**：扫描上传目录，删除那些超过 24 小时且后缀为 `.tmp` 的临时文件。这通常是用户上传了一半中断后留下的垃圾文件。

### 4.1 补充：关于 Redis 的使用
我在 `config` 包里看到了 `RedisConfig.java`，但它的 `@Configuration` 注解被**注释掉**了。
这说明：虽然项目里引入了 Redis 依赖，但目前**并没有启用 Redis 缓存**。所有的 Session 共享、数据缓存目前可能都没生效，或者完全依赖数据库。这在项目初期是为了减少部署复杂度，但在高并发场景下会是第一个性能瓶颈点。

## 5. 实用工具库

这里列出几个极大提升开发幸福感的工具：

*   **Lombok**：
    *   **作用**：通过 `@Data` 注解自动生成 Getter/Setter。
    *   **价值**：让实体类代码变得非常清爽，没有冗余代码。
*   **SpringDoc (OpenAPI)**：
    *   **作用**：自动生成在线接口文档。
    *   **价值**：后端写完代码，文档就自动生成了（访问 `/swagger-ui.html`），前端看着文档就能开发，不用手写 Word 文档。
    *   **安全提示**：**生产环境建议关闭！** 否则黑客能直接看到所有接口定义。
        *   配置方法：在 `application-prod.yml` 中设置 `springdoc.api-docs.enabled=false` 和 `springdoc.swagger-ui.enabled=false`。
*   **Qiniu SDK**：
    *   **作用**：七牛云官方工具包。
    *   **价值**：封装了复杂的签名算法，让我们能轻松生成上传凭证。
*   **P6Spy**：
    *   **作用**：SQL 日志监控。
    *   **价值**：它能拦截并打印出 MyBatis 执行的**完整 SQL 语句**（包含参数），而不是带问号 `?` 的预编译语句，调试 SQL 时非常救命。

---
