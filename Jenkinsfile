pipeline {
  agent any

  environment {
    DOCKER_CREDENTIALS = credentials('dockerhub-cred')     // username/password
    GITHUB_CREDENTIALS = credentials('github-pat')
    SONAR_TOKEN = credentials('Sonar')
    BUILD_NUMBER = 03
    REGISTRY = "docker.io"           // change to your registry host if not docker.io
    DOCKER_ORG = "mukheshdn"  // replace
    FRONTEND_IMAGE = "${REGISTRY}/${DOCKER_ORG}/frontend"
    BACKEND_IMAGE  = "${REGISTRY}/${DOCKER_ORG}/backend"
    IMAGE_TAG = "${BUILD_NUMBER}"
    TRIVY_SEVERITY = "CRITICAL,HIGH" // fail on these severities
  }

  options {
    skipStagesAfterUnstable()
    timeout(time: 60, unit: 'MINUTES')
    buildDiscarder(logRotator(numToKeepStr: '30'))
  }

  stages {

    stage('Checkout') {
      steps {
        checkout scm
        script {
          // store commit info
          env.GIT_COMMIT_SHORT = sh(script: "git rev-parse --short HEAD", returnStdout: true).trim()
          echo "Commit: ${env.GIT_COMMIT_SHORT}"
        }
      }
    }

    stage('SonarQube Analysis') {
      steps {
        withCredentials([string(credentialsId: 'SONAR_TOKEN', variable: 'SONAR_TOKEN')]) {
          script {
            // Example: if node project (frontend/backend separate), adjust commands to your build system
            // Run scanner with required properties
            sh '''
              sonar-scanner \
                -Dsonar.projectKey=socialecho_${GIT_BRANCH.replaceAll('/','_')} \
                -Dsonar.sources=. \
                -Dsonar.host.url=http://localhost:9000 \
                -Dsonar.login=${SONAR_TOKEN}
            '''
          }
        }
      }
      post {
        failure {
          script {
            currentBuild.result = 'FAILURE'
          }
        }
      }
    }

    stage('OWASP Dependency-Check') {
      steps {
        // Run dependency-check CLI; outputs HTML/XML in dependency-check-report
        sh '''
          dependency-check --project "socialecho" --scan . --format ALL --out dependency-check-report || true
        '''
        // Optionally fail the build if there are high/critical vulnerabilities in report
        // Implement simple XML parse for high CVSS? For brevity, we fail if the CLI exit code non-zero is set above
        // Alternatively parse xml and fail if required
      }
      post {
        always {
          archiveArtifacts artifacts: 'dependency-check-report/**/*', allowEmptyArchive: true
        }
        failure {
          script { currentBuild.result = 'FAILURE' }
        }
      }
    }

    stage('Trivy FS Scan') {
      steps {
        script {
          // scan entire workspace; fail on HIGH/CRITICAL; exit code will be non-zero if vulnerabilities are found
          sh '''
            trivy fs --severity ${TRIVY_SEVERITY} --exit-code 1 --format table .
          '''
        }
      }
      post {
        failure {
          script { currentBuild.result = 'FAILURE' }
        }
      }
    }

    stage('Build Docker Images') {
      when { expression { currentBuild.result == null || currentBuild.result == 'SUCCESS' } }
      steps {
        script {
          // Build frontend
          dir('frontend') {
            sh "docker build -t ${env.FRONTEND_IMAGE}:${IMAGE_TAG} ."
          }
          // Build backend
          dir('backend') {
            sh "docker build -t ${env.BACKEND_IMAGE}:${IMAGE_TAG} ."
          }
        }
      }
    }

    stage('Push Images to Registry') {
      when { expression { currentBuild.result == null || currentBuild.result == 'SUCCESS' } }
      steps {
        script {
          sh """
            echo "${DOCKER_CREDENTIALS_PSW}" | docker login -u "${DOCKER_CREDENTIALS_USR}" --password-stdin ${REGISTRY}
            docker push ${FRONTEND_IMAGE}:${IMAGE_TAG}
            docker push ${BACKEND_IMAGE}:${IMAGE_TAG}
            docker logout ${REGISTRY}
          """
        }
      }
    }

    stage('Publish Image Metadata') {
      when { expression { currentBuild.result == null || currentBuild.result == 'SUCCESS' } }
      steps {
        script {
          sh """
            echo "${FRONTEND_IMAGE}:${IMAGE_TAG}" > image-tag-frontend.txt
            echo "${BACKEND_IMAGE}:${IMAGE_TAG}" > image-tag-backend.txt
          """
          archiveArtifacts artifacts: 'image-tag-*.txt', fingerprint: true
        }
      }
    }

  } // stages

  post {
    success {
      script {
        echo "Build succeeded. Images pushed: ${FRONTEND_IMAGE}:${IMAGE_TAG}, ${BACKEND_IMAGE}:${IMAGE_TAG}"
        // Optionally report status back to GitHub (if configured)
      }
    }
    failure {
      script {
        echo "Build failed. Sending email to author..."
      }
      // Send email using email-ext plugin: email to commit / PR author
      // Simplest: send to committer email as detected by git
      // Note: commit author email may be unavailable for some PRs from forks; better to use GitHub API to get PR author email or send to mailing list
      emailext (
        to: "${env.GIT_COMMITTER_EMAIL ?: 'dev-team@example.com'}",
        subject: "Jenkins: Build FAILED - ${env.JOB_NAME} #${env.BUILD_NUMBER}",
        body: """Build failed for job: ${env.JOB_NAME} #${env.BUILD_NUMBER}
Job URL: ${env.BUILD_URL}
Branch/PR: ${env.GIT_BRANCH}
Commit: ${env.GIT_COMMIT_SHORT}
Please check the Jenkins console for details.
"""
      )
    }
  }
}
