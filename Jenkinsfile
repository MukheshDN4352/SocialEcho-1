pipeline {
    agent any

    environment {
        SONAR_HOME = tool name: 'Sonar', type: 'hudson.plugins.sonar.SonarRunnerInstallation'
        DOCKERHUB_USER = 'mukheshdn'
        DOCKER_CREDENTIALS_ID = 'dockerhub-creds'
        GITHUB_CREDENTIALS_ID = 'github-token'   // GitHub username/password credential ID
    }

    stages {

        stage('Check changes') {
            steps {
                script {
                    def changeFiles = sh(returnStdout: true, script: 'git diff --name-only HEAD~1 HEAD').trim()
                    if (changeFiles.contains('deployments/')) {
                        echo "Only deployment files changed. Skipping build."
                        currentBuild.result = 'SUCCESS'
                        return
                    }
                }
            }
        }

        stage('Clone code from GitHub') {
            steps {
                git url: "https://github.com/MukheshDN4352/SocialEcho-1.git", branch: "master"
            }
        }

        stage('Promote existing Canary → Stable') {
            steps {
                script {
                    sh '''
                        echo "Promoting existing canary image to stable..."
                        cd kubernetes

                        FRONT_IMG=$(grep "image:" frontend-canary.yaml | awk '{print $2}')
                        BACK_IMG=$(grep "image:" node-canary.yaml | awk '{print $2}')

                        sed -i "s|image: .*|image: ${FRONT_IMG}|" frontend-server.yaml
                        sed -i "s|image: .*|image: ${BACK_IMG}|" node-server.yaml
                        cd ..
                    '''
                }
            }
        }

        stage('SonarQube Quality Analysis') {
            steps {
                withSonarQubeEnv("Sonar") {
                    sh '''
                        ${SONAR_HOME}/bin/sonar-scanner \
                        -Dsonar.projectName=socialEcho-1 \
                        -Dsonar.projectKey=socialEcho-1
                    '''
                }
            }
        }

        stage('OWASP Dependency Check') {
            steps {
                dependencyCheck additionalArguments: "--scan ./", odcInstallation: 'dc'
                dependencyCheckPublisher pattern: "dependency-check-report.xml"
            }
        }

        stage('Sonar Quality Gate') {
            steps {
                timeout(time: 2, unit: "MINUTES") {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Trivy File System Scan') {
            steps {
                sh '''
                    trivy fs --format table -o trivy-fs-report.html .
                '''
                publishHTML(target: [
                    allowMissing: true,
                    keepAll: true,
                    reportDir: '.',
                    reportFiles: 'trivy-fs-report.html',
                    reportName: 'Trivy FS Report'
                ])
            }
        }

        stage('Build & Push Docker Images') {
            steps {
                script {
                    withCredentials([usernamePassword(credentialsId: env.DOCKER_CREDENTIALS_ID, usernameVariable: 'DOCKERHUB_USERNAME', passwordVariable: 'DOCKERHUB_PASSWORD')]) {
                        sh '''
                            echo "$DOCKERHUB_PASSWORD" | docker login -u "$DOCKERHUB_USERNAME" --password-stdin

                            echo "Building and pushing frontend..."
                            cd client
                            docker build -t mukheshdn/frontend:${BUILD_NUMBER} .
                            docker push mukheshdn/frontend:${BUILD_NUMBER}
                            cd ..

                            echo "Building and pushing backend..."
                            cd server
                            docker build -t mukheshdn/backend:${BUILD_NUMBER} .
                            docker push mukheshdn/backend:${BUILD_NUMBER}
                            cd ..

                            docker logout
                        '''
                    }
                }
            }
        }

        stage('Update Canary with New Images') {
            steps {
                script {
                    sh '''
                        echo "Updating canary YAML files with new images..."
                        cd kubernetes
                        sed -i "s|image: mukheshdn/frontend:.*|image: mukheshdn/frontend:${BUILD_NUMBER}|" frontend-canary.yaml
                        sed -i "s|image: mukheshdn/backend:.*|image: mukheshdn/backend:${BUILD_NUMBER}|" node-canary.yaml
                        cd ..
                    '''
                }
            }
        }

        stage('Commit & Push to GitHub (for ArgoCD sync)') {
            steps {
                script {
                    withCredentials([usernamePassword(credentialsId: env.GITHUB_CREDENTIALS_ID, usernameVariable: 'GIT_USER', passwordVariable: 'GIT_PASS')]) {
                        sh '''
                            echo "Committing and pushing updated YAMLs to GitHub..."
                            git config --global user.email "jenkins@ci.com"
                            git config --global user.name "Jenkins CI"

                            git add kubernetes/frontend-canary.yaml kubernetes/node-canary.yaml kubernetes/frontend-server.yaml kubernetes/node-server.yaml
                            git commit -m "Update Canary & Promote Stable - Build #${BUILD_NUMBER}" || echo "No changes to commit"

                            git push https://$GIT_USER:$GIT_PASS@github.com/MukheshDN4352/SocialEcho-1.git master
                        '''
                    }
                }
            }
        }
    }

    post {
        success {
            echo "✅ Pipeline completed successfully. Docker images pushed with tag ${BUILD_NUMBER}."
            mail to: 'mukheshdn.cs23@bmsce.ac.in',
                 subject: "Jenkins Build SUCCESS: ${env.JOB_NAME} [#${env.BUILD_NUMBER}]",
                 body: """
Hello,

The Jenkins pipeline ${env.JOB_NAME} completed successfully. ✅

Build Number: ${env.BUILD_NUMBER}
Status: SUCCESS
Project: SocialEcho

You can view the build details here:
${env.BUILD_URL}

Regards,
Jenkins CI/CD
"""
        }

        failure {
            echo "❌ Pipeline failed."
            mail to: 'mukheshdn.cs23@bmsce.ac.in',
                 subject: "Jenkins Build FAILED: ${env.JOB_NAME} [#${env.BUILD_NUMBER}]",
                 body: """
Hello,

The Jenkins pipeline ${env.JOB_NAME} has FAILED. ❌

Build Number: ${env.BUILD_NUMBER}
Status: FAILURE

Please check the Jenkins console logs for more details:
${env.BUILD_URL}

Regards,
Jenkins CI/CD
"""
        }

        always {
            cleanWs()
        }
    }
}
